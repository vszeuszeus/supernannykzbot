const Telegraf = require('telegraf');
const Sequelize = require('sequelize');
const Calendar = require('telegraf-calendar-telegram');
const moment = require('moment');
const CronJob = require('cron').CronJob;
const AmountCalculator = require('./amountCalculator');
moment.locale('ru');
moment.updateLocale('ru', {
    months: [
        "Января", "Февраля", "Марта", "Апреля", "Мая", "Июня", "Июля",
        "Августа", "Сентября", "Октября", "Ноября", "Декабря"
    ]
});
moment.updateLocale('ru', {
    weekdays: [
        "Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"
    ]
});

//const token = "494928840:AAHD8Aiven5HcWQf-9k2WLQsv5S8WStITi0";
//const token = "497454060:AAHiV3SLyh5uNs21ifikpzwfOWMLAyHjfN8"; //testerhomenko
const token = "485527689:AAHKpVXaxb6M1GXcZO7gz7mzQWJ8f9IM2w8"; //main

const bot = new Telegraf(token);

const calendar = new Calendar(bot, {
    startWeekDay: 1,
    weekDayNames: ["П", "В", "С", "Ч", "П", "С", "В"],
    monthNames: [
        "Янв", "Фев", "Мар", "Апр", "Май", "Июнь",
        "Июль", "Авг", "Сен", "Окт", "Ноя", "Дек"
    ]
});

/*const database = "supernanny";
const user = "root";
const password = "s12q!Bza";
const host = "localhost";*/

const database = "supernanny";
const user = "supernannydb";
const password = "93TntM9aWgWM3NDVBqoW";
const host = "localhost";

const sequelize = new Sequelize(database, user, password, {
    timezone: "+06:00",
    host: host,
    port: 3310,
    dialect: 'mysql',
    pool: {
        max: 20,
        min: 0,
        idle: 10000
    },
    define: {
        timestamps: false
    }
});

const Op = Sequelize.Op;

//START MODELS
const User = sequelize.define('users', {
    id:
        {
            type: Sequelize.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
    phone: Sequelize.STRING,
    name: Sequelize.STRING,
    lastname: Sequelize.STRING,
    role: Sequelize.ENUM('user', 'nanny', 'admin'),
    created_at: Sequelize.DATE,
    updated_at: Sequelize.DATE,
    telegram_id: Sequelize.BIGINT,
    photo: Sequelize.STRING
});

const NannyOrder = sequelize.define('nanny_orders', {
    id:
        {
            type: Sequelize.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
    norder_id: Sequelize.INTEGER.UNSIGNED,
    nanny_id: Sequelize.INTEGER.UNSIGNED,

});

const NOrder = sequelize.define('norders', {
    id:
        {
            type: Sequelize.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
    user_id: Sequelize.INTEGER.UNSIGNED,
    start: Sequelize.DATE,
    end: Sequelize.DATE,
    is_payed: Sequelize.INTEGER,
    is_confirmed: Sequelize.INTEGER,
    created_at: Sequelize.DATE,
    updated_at: Sequelize.DATE,
    child_count: Sequelize.INTEGER,
    payed_type: Sequelize.STRING(30),
    amount: Sequelize.INTEGER,
    order_id: Sequelize.INTEGER,
    babies: Sequelize.INTEGER
});

const Nanny = sequelize.define('nannies', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: Sequelize.INTEGER.UNSIGNED,
    biography: Sequelize.TEXT,

});

const Order = sequelize.define('orders', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: Sequelize.INTEGER,
    sum: Sequelize.DECIMAL(10, 2),
    paket: Sequelize.STRING(16),
    status: Sequelize.INTEGER,
    created: Sequelize.DATE,
    option: Sequelize.ENUM('expr', 'qiwi', 'kkb', 'n/n')
});



Nanny.belongsToMany(NOrder, {
    through: 'nanny_orders',
    foreignKey: 'nanny_id'
});
NOrder.belongsToMany(Nanny, {
    through: 'nanny_orders',
    foreignKey: 'norder_id'
});
NOrder.belongsTo(User, {
    as: "nuser", foreignKey: "user_id"
});
Nanny.belongsTo(User, {as: 'user', foreignKey: "user_id"});



// CRON
let cronSenderStartOrder = new CronJob({
    cronTime: '0 * * * * *',
    onTick: function() {
        let dataTimeNextHour = moment().add(1, 'h');
        NOrder.findAll({
            where: {
                start: dataTimeNextHour,
                is_payed: 1
            },
            include: [{
                as : "nannies",
                model: Nanny,
                include: [{
                    as : "user",
                    model: User
                }]
            },
            {
                as: "nuser",
                model: User
            }]
        }).then(result => {
            console.log(result);
            if(result){
                result.forEach(function(item){
/*                    console.log(item.nannies);
                    console.log(item.nuser);
                    console.log(item.nannies[0].user);*/
                    let nannyNames = [];
                    item.nannies.forEach(function(itemN){
                        nannyNames.push((itemN.user.name) ? itemN.user.name : "Без имени");
                        if(itemN.user.telegram_id){
                            bot.telegram.sendMessage(itemN.user.telegram_id, "" +
                                "Заказ № <b>" + item.id + "</b> начинается через 1 час. Пожалуйста, не опаздывайте!\n" +
                                "Информация о заказе:\n" +
                                "<b>Дата начала:</b> " + moment(item.start).format("dddd, D MMMM YYYY, HH:mm:ss") + "\n",
                                "<b>Дата окончания:</b> " + moment(item.end).format("dddd, D MMMM YYYY, HH:mm:ss") + "\n" +
                                "<b>Общее количество детей:</b> " + item.child_count + "\n" +
                                "<b>Количество детей мл. 18мес.:</b> " + item.babies + "\n" +
                                "<b>Количество нянь:</b> " + nannyNames.length,
                                {parse_mode:"html"});
                        }
                    });
                    if(item.nuser.telegram_id){
                        bot.telegram.sendMessage(item.nuser.telegram_id, 'Ваш заказ № <b>' + item.id + '</b> начинается через <b>1</b> час.\n' +
                            ((nannyNames.length === 1) ? "Суперняня " : "Суперняни ") + nannyNames.join(', ') + " " +
                            ((nannyNames.length === 1) ? "прилетит " : "прилетят ") + "" +
                            "в " + moment(item.start).format("dddd, D MMMM YYYY, HH:mm:ss"), {parse_mode: "html"});
                    }
                });
            }
        })
    },
    start: true,
    timeZone: 'Asia/Almaty'
});

let cronSenderEndOrder = new CronJob({
    cronTime: '0 * * * * *',
    onTick: function() {
        let dataTime = moment();
        NOrder.findAll({
            where: {
                end: dataTime,
                is_payed: 1
            },
            include: [{
                as : "nannies",
                model: Nanny,
                include: [{
                    as : "user",
                    model: User
                }]
            },
                {
                    as: "nuser",
                    model: User
                }]
        }).then(result => {
            console.log(result);
            if(result){
                result.forEach(function(item){
                    /*                    console.log(item.nannies);
                                        console.log(item.nuser);
                                        console.log(item.nannies[0].user);*/
                    let nannyNames = [];
                    let text = "";
                    item.nannies.forEach(function(itemN){
                        nannyNames.push((itemN.user.name) ? itemN.user.name : "Без имени");
                        if(itemN.user.telegram_id){
                            bot.telegram.sendMessage(itemN.user.telegram_id, "" +
                                "Заказ № <b>" + item.id + "</b> завершен! Благодарим Вас за оказанные услуги!.\n" +
                                "Информация о заказе:\n" +
                                "<b>Дата начала:</b> " + moment(item.start).format("dddd, D MMMM YYYY, HH:mm:ss") + "\n",
                                "<b>Дата окончания:</b> " + moment(item.end).format("dddd, D MMMM YYYY, HH:mm:ss") + "\n" +
                                "<b>Общее количество детей:</b> " + item.child_count + "\n" +
                                "<b>Количество детей мл. 18мес.:</b> " + item.babies + "\n" +
                                "<b>Количество нянь:</b> " + nannyNames.length,
                                {parse_mode:"html"});
                        }
                        text = text + "<a href='http://supernanny.kz/" + itemN.id+"'>" +
                            ((itemN.user.name) ? itemN.user.name : "Без имени") + "</a>\n"
                    });


                    if(item.nuser.telegram_id){
                        bot.telegram.sendMessage(item.nuser.telegram_id, 'Ваш заказ № <b>' + item.id + '</b> завершен!' +
                            'Благодарим за использование Сервиса почасовых супернянь.\n' +
                            "Оставьте, пожалуйста, комментарии о наших нянях:" +
                            text
                            , {parse_mode: "html"});
                    }
                });
            }
        })
    },
    start: true,
    timeZone: 'Asia/Almaty'
});

/*let cronSenderEndOrder = new CronJob({
    cronTime: '0 * * * *',
    onTick: function() {
        let dataTimeNow = moment();
        NOrder.findAll({
            where: {
                start: dataTimeNow
            },
            include: [{
                as : "nannies",
                model: Nanny,
                include: [{
                    as : "user",
                    model: User
                }]
            },
                {
                    model: User
                }]
        }).then(result => {
            if(result){
                result.forEach(function(item){

                });
            }

        })
    },
    start: false,
    timeZone: 'Asia/Almaty'
});
cronSenderEndOrder.start();*/

let userSessions = {
    setNewSession: function (ctx, NewUserSession) {
        if (!userSessions.hasOwnProperty(NewUserSession.telegram_id)) {
            userSessions[NewUserSession.telegram_id] = NewUserSession;
        } else {
            userSessions.deleteSessionMessages(ctx);
            userSessions[NewUserSession.telegram_id] = NewUserSession;
        }
    },
    getSession: function (ctx) {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            return userSessions[chat_id];
        } else {
            return false;
        }
    },
    testSession: function (ctx) {
        let session = userSessions.getSession(ctx);
        if (session) {
            if (
                session.telegram_id &&
                session.city &&
                session.selectedNannies.length &&
                session.offer &&
                session.phone &&
                session.countChildren &&
                session.order.startTime &&
                session.order.endTime &&
                session.order.startDate &&
                session.order.endDate) {
                return true;
            }
        }
        return false;
    },
    deleteSession: function (ctx) {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            delete userSessions[chat_id];
        } else {
            return false;
        }
    },
    setSessionOffer: function (ctx, offer = false) {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            userSessions[chat_id].offer = offer;
        } else {
            userSessions.setNewSession(ctx, new NewUserSession(ctx));
        }
    },
    setSessionCity: function (ctx, city = "Astana") {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            userSessions[chat_id].city = city;
        } else {
            return false;
        }
    },
    setCountChildren: function (ctx, count = 1) {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            userSessions[chat_id].countChildren = count;
        } else {
            return false;
        }
    },
    getCountChildren: function (ctx) {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            return userSessions[chat_id].countChildren;
        } else {
            return false;
        }
    },
    setCountMiniChildren: function (ctx, count = 1) {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            userSessions[chat_id].countMiniChildren = count;
        } else {
            return false;
        }
    },
    setSessionAmount: function (ctx, amount = 20) {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            userSessions[chat_id].amount = amount;
        } else {
            return false;
        }
    },
    getCountMiniChildren: function (ctx) {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            return userSessions[chat_id].countMiniChildren;
        } else {
            return false;
        }
    },
    getSessionAmount: function (ctx) {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            return userSessions[chat_id].amount;
        } else {
            return false;
        }
    },
    setSessionContacts: function (ctx, userId = null, firstName = null, lastName = null, phone = null) {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            userSessions[chat_id].userId = userId;
            userSessions[chat_id].firstName = firstName;
            userSessions[chat_id].lastName = lastName;
            userSessions[chat_id].phone = phone;
        } else {
            return false;
        }
    },
    getSessionType: function (ctx) {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            return userSessions[chat_id].sessionType;
        } else {
            return false;
        }
    },
    setSessionType: function (ctx, sessionType = "order") {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            userSessions[chat_id].sessionType = sessionType;
        } else {
            return false;
        }
    },
    getOrderDate: function (ctx, type = "start") {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            return userSessions[chat_id].order[type + "Date"];
        } else {
            return false;
        }
    },
    getOrderDateRe: function (ctx, type = "start") {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            return moment(userSessions[chat_id].order[type + "Date"]).format("dddd, D MMMM YYYY");
        } else {
            return false;
        }
    },
    setOrderDate: function (ctx, date, type = "start") {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            userSessions[chat_id].order[type + 'Date'] = date;
        } else {
            return false;
        }
    },
    getOrderTime: function (ctx, type = "start") {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            return userSessions[chat_id].order[type + "Time"];
        } else {
            return false;
        }
    },
    setOrderTime: function (ctx, time, type = "start") {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            userSessions[chat_id].order[type + "Time"] = time;
        } else {
            return false;
        }
    },
    getOrderFullTime: function (ctx, type = "start") {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            return userSessions[chat_id].order[type + "Date"]
                + " " + userSessions[chat_id].order[type + "Time"] + ":00";
        } else {
            return false;
        }
    },
    getOrderFullTimeRe: function (ctx, type = "start") {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            return moment(userSessions[chat_id].order[type + "Date"]
                + " " + userSessions[chat_id].order[type + "Time"] + ":00").format("dddd, D MMMM YYYY, HH:mm:ss");
        } else {
            return false;
        }
    },
    setOrderNowType: function (ctx, type = "start") {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            userSessions[chat_id].order.nowType = type;
        } else {
            return false;
        }
    },
    getOrderNowType: function (ctx) {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            return userSessions[chat_id].order.nowType;
        } else {
            return false;
        }
    },
    getSessionSendedMessages: function (ctx) {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            return userSessions[chat_id].sendedMessages;
        } else {
            return false;
        }
    },
    setSessionSendedMessage: function (ctx, message_id) {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            userSessions[chat_id].sendedMessages.push(message_id);
        } else {
            return false;
        }
    },
    deleteSessionMessages: function (ctx) {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        let messages = userSessions.getSessionSendedMessages(ctx);
        if (messages) {
            messages.forEach(function (item) {
                bot.telegram.deleteMessage(chat_id, item);
            });
            userSessions[chat_id].sendedMessages = [];
        }
    },
    setCountNannies: function (ctx, count = 1) {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            userSessions[chat_id].countNannies = count;
        } else {
            return false;
        }
    },
    getCountNannies: function (ctx) {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            return userSessions[chat_id].countNannies;
        } else {
            return false;
        }
    },
    setSelectedNanny: function (ctx, nanny_id) {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            userSessions[chat_id].selectedNannies.push(nanny_id);
        } else {
            return false;
        }
    },
    getSelectedNannies: function (ctx) {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            return userSessions[chat_id].selectedNannies;
        } else {
            return false;
        }
    }
};
let NewUserSession = function (ctx) {
    this.telegram_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
    this.userId = null;
    this.firstName = null;
    this.lastName = null;
    this.phone = null;
    this.city = null; //город заказа
    this.amount = 20; //сумма заказа
    this.offer = null; //соглашения публ. оферты
    this.selectedNannies = []; //выбранные няни
    this.countNannies = null; //нужное количество нянь
    this.saved = false;
    this.sendedMessages = []; //отравленные сообщения
    this.countChildren = null; //количество детей
    this.countMiniChildren = 0; //количество <1.5 года детей из общего количества
    this.sessionType = null; //хранение тип сессиии
    this.order = {
        startDate: null,
        endDate: null,
        startTime: null,
        endTime: null,
        nowType: null //хранение типа даты для пикера
    };
};

bot.start((ctx) => {
    userSessions.deleteSessionMessages(ctx);
    sendMenu(ctx);
});

bot.hears('📜 Главное меню', (ctx) => {
    userSessions.deleteSessionMessages(ctx);
    sendMenu(ctx);
});

let mainMenuKeyboard = {
    "reply_markup": {
        resize_keyboard: true,
        keyboard: [
            [{text: "🗓 Мои заказы"}, {text: "🕰 Заказать няню"}],
            [{text: "👩‍👦‍👦 Для няни"}, {text: "☎️ Контакты"}]
        ]
    }
};

function sendMenu(ctx) {
    return ctx.reply('📜 Главное меню', mainMenuKeyboard);
}

bot.hears('🕰 Заказать няню', (ctx) => {
    userSessions.deleteSessionMessages(ctx);
    return ctx.reply('Здесь вы можете выбрать и пригласить бебиситтера с сервиса почасовых супернянь для своего' +
        ' ребенка от 0 до 10 лет. Наши суперняни отобраны, обучены, прошли медосмотр. Чтобы сделать заказ ' +
        'нужно поделиться своими контактными данными.', {
        reply_markup: {
            resize_keyboard: true,
            keyboard: [
                [{text: "👤 Поделиться контактными данными", request_contact: true}],
                [{text: "📜 Главное меню"}]]
        }
    }).then(result => {
        if (result.message_id) {
            userSessions.setNewSession(ctx, new NewUserSession(ctx));
            userSessions.setSessionSendedMessage(ctx, result.message_id);
            userSessions.setSessionType(ctx, "order");
        }
    });
});

bot.hears('☎️ Контакты', (ctx) => {
    userSessions.deleteSessionMessages(ctx);
    userSessions.setNewSession(ctx, new NewUserSession(ctx));
    return ctx.reply('Наши контакты: \nEmail:info@supernanny.kz');
});

bot.hears('👩‍👦‍👦 Для няни', (ctx) => {
    userSessions.deleteSessionMessages(ctx);
    userSessions.setNewSession(ctx, new NewUserSession(ctx));
    return ctx.reply('Если Вы почасовая няня с сайта http://supernanny.kz, пожалуйста, поделитесь ' +
        'контактным данными, чтобы мы записали Вас в систему уведомлений.', {
        reply_markup: {
            resize_keyboard: true,
            keyboard: [
                [{text: "👤 Поделиться контактными данными", request_contact: true}],
                [{text: "📜 Главное меню"}]]
        }
    }).then(result => {
        if (result.message_id) {
            userSessions.setSessionSendedMessage(ctx, result.message_id);
            userSessions.setSessionType(ctx, "remember_nanny_telegram");
        }
    });
});

bot.hears('🗓 Мои заказы', (ctx) => {
    userSessions.deleteSessionMessages(ctx);
    userSessions.setNewSession(ctx, new NewUserSession(ctx));
    User.findOne({
        where: {
            telegram_id: ctx.message.chat.id
        }
    }).then(user => {
        if (user) {
            NOrder.findAll({
                where: {
                    user_id: user.id
                },
                include: [{
                    as : "nannies",
                    model: Nanny,
                    include: [{
                        as : "user",
                        model: User
                    }]
                }]
            }).then(orders => {
                if (orders.length) {
                    orders.forEach(function (item, index) {
                        let status = (item.is_payed === 0) ? "не оплачен" : "оплачен";
                        ctx.reply("" +
                            "<b>1. Идентификатор заказа:</b> " + item.id + "\n" +
                            "<b>2. Дата создания:</b> " + moment(item.created_at).format("dddd, D MMMM YYYY, HH:mm:ss") + "\n" +
                            "<b>3. Дата начала:</b> " + moment(item.start).format("dddd, D MMMM YYYY, HH:mm:ss") + "\n" +
                            "<b>4. Дата окончания:</b> " + moment(item.end).format("dddd, D MMMM YYYY, HH:mm:ss") + "\n" +
                            "<b>5. Сумма к оплате:</b> " + item.amount + " тенге \n" +
                            "<b>6. Статус:</b> " + status + "\n" +
                            "<b>7. Количество детей:</b> " + item.child_count + "\n" +
                            "<b>7. Количество нянь:</b> " + item.nannies.length + "\n", {
                            parse_mode: "HTML"
                        });
                    })
                } else {
                    ctx.reply('<b>Список Ваших заказов пуст!</b>', {
                        parse_mode: "HTML"
                    });
                }
            });
        } else {
            ctx.reply('<b>Список Ваших заказов пуст!</b>', {
                parse_mode: "HTML"
            });
        }
    });

});

calendar.setDateListener((ctx, calDate) => {
    let type = userSessions.getOrderNowType(ctx);
    userSessions.setOrderDate(ctx, calDate, type);
    sendOrderTimeChooser(ctx, type);
});

bot.on('contact', (ctx) => {
    userSessions.deleteSessionMessages(ctx);
    let phone = ctx.message.contact.phone_number.substr(ctx.message.contact.phone_number.length - 10);
    let name = (ctx.message.contact.first_name) ? ctx.message.contact.first_name : null;
    let lastName = (ctx.message.contact.last_name) ? ctx.message.contact.last_name : null;

    switch (userSessions.getSessionType(ctx)) {
        case "order":
            userSessions.setSessionContacts(ctx, null, name, lastName, phone);
            sendOffer(ctx);
            break;
        case "remember_nanny_telegram":
            User.findOne({
                where: {
                    phone: {
                        [Op.like]: '%' + phone
                    }
                }
            }).then(user => {
                let returnMessage = null;
                if (user) {
                    switch (user.role) {
                        case "nanny":
                            if (!user.telegram_id) {
                                user.telegram_id = ctx.message.chat.id;
                                user.save();
                                returnMessage = 'Отлично. Я Вас уведомлю при оформлении заказа и за 1 час до начала!';
                            } else {
                                returnMessage = 'Ваш контакт уже сохранен. Я Вас уведомлю при оформлении заказа и за 1 час до начала!';
                            }
                            break;
                        default :
                            returnMessage = 'Ваш профиль на сайте http://supernanny.kz не соотвествует необходимой роли';
                    }
                } else {
                    returnMessage = 'Вы незарегистрированный пользователь на сайте http://supernanny.kz';
                }
                ctx.reply(returnMessage, {
                    "reply_markup": {
                        resize_keyboard: true,
                        keyboard: [
                            [{text: "🗓 Мои заказы"}, {text: "🕰 Заказать няню"}],
                            [{text: "👩‍👦‍👦 Для няни"}, {text: "☎️ Контакты"}]
                        ]
                    }
                });
            });
            break;
        default :
            break;
    }
});

bot.on('callback_query', (ctx) => {
    if(!userSessions.getSession(ctx)){
        ctx.reply('Ваша сессия была разорвана, либо утеряна. Запуск главного меню...');
        sendMenu(ctx);
    }else{
        let cData = ctx.update.callback_query.data;
        let splitData = cData.split('_');
        switch (splitData[0]) {
            case "offer" :
                switch (splitData[1]) {
                    case "yes":
                        userSessions.setSessionOffer(ctx, true);
                        sendQuestionCity(ctx);
                        break;
                    case "no":
                        sendNeedToAccessOffer(ctx);
                        break;
                }
                break;

            case "needCity":
                switch (splitData[1]) {
                    case "Astana":
                        userSessions.setSessionCity(ctx, "Astana");
                        break;
                    case "Almata":
                        userSessions.setSessionCity(ctx, "Almata");
                        break;
                }
                sendChildCountChooser(ctx);
                break;

            case "countChildren":
                let countChildren = +splitData[1];
                userSessions.setCountChildren(ctx, countChildren);
                (countChildren === 1) ? sendChildYears(ctx)
                    : sendMiniChildCount(ctx);
                break;

            case "yearChild":
                let yearChild = +splitData[1];
                (yearChild === 1) ? userSessions.setCountMiniChildren(ctx, 1)
                    : userSessions.setCountMiniChildren(ctx, 0);
                matchCountNanny(ctx);
                sendOrderDateChooser(ctx, "start");
                break;

            case "countMiniChildren":
                let countMiniChildren = +splitData[1];
                userSessions.setCountMiniChildren(ctx, countMiniChildren);
                matchCountNanny(ctx);
                sendOrderDateChooser(ctx, "start");
                break;

            case "timePicker":
                if (splitData[1] === "start" || splitData[1] === "end") {
                    recalcTimePicker(ctx);
                }
                if (splitData[1] === "quit") {
                    switch (splitData[2]) {
                        case "start":
                            if (testTime(ctx)) {
                                sendOrderDateChooser(ctx, "end");
                            } else {
                                sendOrderDateChooser(ctx, "start", "Выбрано некорректное время!");
                            }
                            break;
                        case "end":
                            if (testTime(ctx)) {
                                calcAmount(ctx);
                                sendFreeNannies(ctx);
                            } else {
                                sendOrderDateChooser(ctx, "end", "Выбрано некорректное время! Минимальное время бронирования 3 часа.");
                            }
                    }
                }
                break;

            case "chooseNanny":
                userSessions.setSelectedNanny(ctx, +splitData[1]);
                sendFreeNannies(ctx);
                break;

            case "payment":
                switch (splitData[1]) {
                    case "bankCard":
                        saveOrderStartPay(ctx, "epay");
                        break;
                    case "qiwi":
                        saveOrderStartPay(ctx, "qiwi");
                        break;
                }
                break;

            case "restart":
                switch (splitData[1]) {
                    case "sendOffer":
                        sendOffer(ctx);
                        break;
                    case "time":
                        sendOrderTimeChooser(ctx, 'start');
                        break;
                    case "countChild":
                        sendChildCountChooser(ctx);
                        break;
                }
                break;

            case "mainMenu":
                userSessions.deleteSessionMessages(ctx);
                sendMenu(ctx);
                break;

            default:
                break;
        }
    }
});

function matchCountNanny(ctx) {
    let countC = userSessions.getCountChildren(ctx);
    let countNanny = userSessions.getCountMiniChildren(ctx);
    let a = countC - countNanny;
    countNanny += (Math.floor(a / 3)) + ((a % 3 !== 0) ? 1 : 0);
    userSessions.setCountNannies(ctx, countNanny);
}

function calcAmount(ctx) {
    let startDate = userSessions.getOrderFullTime(ctx, 'start');
    let endDate = userSessions.getOrderFullTime(ctx, 'end');
    let babies = userSessions.getCountMiniChildren(ctx);
    let children = userSessions.getCountChildren(ctx);
    let calcObj = new AmountCalculator(children, babies, startDate, endDate);
    userSessions.setSessionAmount(ctx, calcObj.getResults())
}

function testTime(ctx) {
    let type = userSessions.getOrderNowType(ctx);
    let result = null;
    switch (type) {
        case "start":
            let nowTime = new Date();
            let splitDate = userSessions.getOrderDate(ctx, type).split("-");
            let splitTime = userSessions.getOrderTime(ctx, type).split(":");
            let userTime = new Date(splitDate[0], splitDate[1] - 1, splitDate[2], splitTime[0], splitTime[1]);
            result = (userTime - nowTime) / (1000 * 60 * 60);
            if (result >= 3) {
                return true;
            } else {
                return false;
            }
        case "end":
            let splitDateStart = userSessions.getOrderDate(ctx, "start").split("-");
            let splitTimeStart = userSessions.getOrderTime(ctx, "start").split(":");
            let splitDateEnd = userSessions.getOrderDate(ctx, "end").split("-");
            let splitTimeEnd = userSessions.getOrderTime(ctx, "end").split(":");
            let startTime = new Date(splitDateStart[0], splitDateStart[1] - 1, splitDateStart[2], splitTimeStart[0], splitTimeStart[1]);
            let endTime = new Date(splitDateEnd[0], splitDateEnd[1] - 1, splitDateEnd[2], splitTimeEnd[0], splitTimeEnd[1]);
            result = (endTime - startTime) / (1000 * 60 * 60);
            if (result >= 3) {
                return true;
            } else {
                return false;
            }
    }

}

function addMainMenu(ctx, message = "No message") {
    return ctx.reply(message, mainMenuKeyboard).then(
        result => {
            if (result.message_id) {
                userSessions.setSessionSendedMessage(ctx, result.message_id);
            }
        }
    );
}

function sendOffer(ctx) {
    userSessions.deleteSessionMessages(ctx);
    addMainMenu(ctx, "Шаг № 1").then(result => {
        ctx.reply('Перед тем как выбрать няню, необходимо принять условия публичной оферты. http://telegra.ph/Publichnaya-oferta-httpsupernannykz-01-29', {
            reply_markup: {
                inline_keyboard: [
                    [{text: "Принимаю", callback_data: "offer_yes"}],
                    [{text: "Не принимаю", callback_data: "offer_no"}]]
            }
        }).then(
            result => {
                if (result.message_id) {
                    userSessions.setSessionSendedMessage(ctx, result.message_id);
                }
            }
        );
    });

}

function sendNeedToAccessOffer(ctx) {
    userSessions.deleteSessionMessages(ctx);
    addMainMenu(ctx, "Отмена правил оферты:").then(result => {
        ctx.reply('К сожалению, чтобы воспользоваться нашим сервисом Вы должны принять условия оферты.', {
            "reply_markup": {
                "inline_keyboard": [
                    [{text: "🕰 Начать заказ с начала", callback_data: "restart_sendOffer"}]]
            }
        }).then(
            result => {
                if (result.message_id) {
                    userSessions.setSessionSendedMessage(ctx, result.message_id);
                }
            }
        );
    });
}


function sendQuestionRestart(ctx) {
    userSessions.deleteSessionMessages(ctx);
    return ctx.reply('Возможно вы еще не решились воспользоваться нашим сервисом. ' +
        'Предлагаем вам познакомиться с нашими супернянями и посмотреть видео о нас тут - http://supernanny.kz', {
        reply_markup: {
            inline_keyboard: [
                [{text: "Начать с начала", callback_data: "restart"}],
                [{text: "Выйти", callback_data: "byeBye"}]]
        }
    }).then(result => {
        if (result.message_id) {
            userSessions.setSessionSendedMessage(ctx, result.message_id);
        }
    });
}

function sendQuestionCity(ctx) {
    userSessions.deleteSessionMessages(ctx);
    addMainMenu(ctx, "Шаг № 2").then(result => {
        ctx.reply('В каком городе вам нужна няня?', {
            "reply_markup": {
                "inline_keyboard": [
                    [{text: "Астана", callback_data: "needCity_Astana"}],
                    [{text: "Алматы", callback_data: "needCity_Almata"}]]
            }
        }).then(result => {
            if (result.message_id) {
                userSessions.setSessionSendedMessage(ctx, result.message_id);
            }
        });
    });
}

function sendChildCountChooser(ctx) {
    userSessions.deleteSessionMessages(ctx);
    addMainMenu(ctx, "Шаг № 3").then(result => {
        ctx.reply(
            '<b>Для какого количества детей Вам нужна няня?</b>\n' +
            'Стоимость нянь:\n' +
            'С <b>09.00</b> до <b>21.00</b> – 1 час 1800 тг. (1,2 ребёнка), 2000 (3 ребёнка) \n' +
            'С <b>21.00</b> до <b>09.00</b> – 1 час 2000 тг (1,2 ребёнка), 2500 тг (3 ребёнка)\n' +
            'Каждя няня следит максимум за тремя детьми.\n' +
            'Каждый ребенок моложе 18 мес. требует внимания отдельной няни.', {
            "reply_markup": {
                "inline_keyboard": [
                    [{text: "1", callback_data: "countChildren_1"},
                    {text: "2", callback_data: "countChildren_2"},
                    {text: "3", callback_data: "countChildren_3"},
                    {text: "4", callback_data: "countChildren_4"},
                    {text: "5", callback_data: "countChildren_5"},
                    {text: "6", callback_data: "countChildren_6"},
                    {text: "7", callback_data: "countChildren_7"},
                    {text: "8", callback_data: "countChildren_8"}]
                ]
            },
            parse_mode: 'html'
        }).then(result => {
            if (result.message_id) {
                userSessions.setSessionSendedMessage(ctx, result.message_id);
            }
        });
    });
}

function sendMiniChildCount(ctx) {
    userSessions.deleteSessionMessages(ctx);
    let childs = userSessions.getCountChildren(ctx);
    let keyboard = [{text: "Нету", callback_data: "countMiniChildren_0"}];
    for (let i = 1; i <= childs; i++) {
        keyboard.push({text: i, callback_data: "countMiniChildren_" + i})
    }
    addMainMenu(ctx, 'Шаг № 4').then(result => {
        let message = "";
        if(childs === 1) {
            message = "Выбран 1 ребенок.";
        }
        if((childs > 1) && (childs < 5)){
            message = "Выбрано " + childs + " ребенка.";
        }
        if(childs > 4) {
            message = "Выбрано " + childs + " детей.";
        }

        ctx.reply(message + '\n' +
            '<b>Выберите количество детей моложе 18 мес.</b>', {
            "reply_markup": {
                "inline_keyboard": [keyboard],
            },
            parse_mode: 'html'
        }).then(result => {
            if (result.message_id) {
                userSessions.setSessionSendedMessage(ctx, result.message_id);
            }
        });
    });
}

function sendChildYears(ctx) {
    userSessions.deleteSessionMessages(ctx);

    addMainMenu(ctx, "Шаг № 4").then(result => {
        ctx.reply("Пожалуйста, выберите возраст ребенка", {
            "reply_markup": {
                "inline_keyboard": [
                    [
                        {text: "мл. 18 м.", callback_data: "yearChild_1"},
                        {text: "2 года", callback_data: "yearChild_2"},
                        {text: "3 года", callback_data: "yearChild_3"},
                        {text: "4 года", callback_data: "yearChild_4"}
                    ],
                    [
                        {text: "5 лет", callback_data: "yearChild_5"},
                        {text: "6 лет", callback_data: "yearChild_6"},
                        {text: "7 лет", callback_data: "yearChild_7"},
                        {text: "8 лет", callback_data: "yearChild_8"},
                        {text: "9 лет", callback_data: "yearChild_9"},
                        {text: "10 лет", callback_data: "yearChild_10"}
                    ]
                ],
            }
        }).then(result => {
            if (result.message_id) {
                userSessions.setSessionSendedMessage(ctx, result.message_id);
            }
        });
    });
}

function sendOrderDateChooser(ctx, type = "start", error = "") {
    userSessions.deleteSessionMessages(ctx);
    let message = "";
    let preMessage = "\n<b>*Дата бронирования должна опережать текущее время не меньше чем на 3 часа.</b>\n" +
        "<b>*Заказы продолжительностью менее 3 часов не принимаются.</b>";

    switch (type) {
        case "start":
            message = "<b>Пожалуйста, выберите в календаре день начала заказа.</b>" + preMessage;
            break;
        case "end":
            message = "<b>Пожалуйста, выберите в календаре день окончания заказа.</b>\n" +
                "<b>День начала заказа:</b>\n" + userSessions.getOrderFullTimeRe(ctx, "start");
            break;
    }
    message += '\nСтоимость нянь:\n' +
        'С <b>09.00</b> до <b>21.00</b> – 1 час 1800 тг. (1,2 ребёнка), 2000 (3 ребёнка) \n' +
        'С <b>21.00</b> до <b>09.00</b> – 1 час 2000 тг (1,2 ребёнка), 2500 тг (3 ребёнка)\n';

    userSessions.setOrderNowType(ctx, type);
    if (error) {
        let newError = "<b>Ошибка: " + error + "</b>\n";
        message = newError + message;
    }
    let step = (type === "start") ? "5" : "7";
    addMainMenu(ctx, "Шаг № " + step).then(result => {
        ctx.reply(message, calendar.getCalendar())
            .then(result => {
                if (result.message_id) {
                    userSessions.setSessionSendedMessage(ctx, result.message_id);
                }
            });
    });

}

function sendOrderTimeChooser(ctx, type = "start") {
    userSessions.deleteSessionMessages(ctx);
    let time = null;
    if (userSessions.getOrderTime(ctx, type)) {
        time = userSessions.getOrderTime(ctx, type);
    } else {
        time = new Date().getHours() + ":00";
        userSessions.setOrderTime(ctx, time, type);
    }
    makeDatePicker(ctx, time, type);
}

function makeDatePicker(ctx, time, type = "start") {

    let val = (type === "start") ? "timePicker_start" : "timePicker_end";
    let text = (type === "start")
        ?   '<b>Выбранный день: </b>' + userSessions.getOrderDateRe(ctx, "start") +
            '\nВыберите время <b>начала</b>  заказа. \nПрибавте либо отнимите промежуток времени при помощи кнопок ниже,' +
            ' иначе нажмите "Готово" если указанное время Вас устраивает'
        :   '<b>Дата начала заказа:</b>\n' + userSessions.getOrderFullTimeRe(ctx, "start") + "\n" +
            "<b>День окончания заказа:</b>\n" + userSessions.getOrderDateRe(ctx, "end") +
            '\nВыберите время <b>окончания</b>  заказа. \nПрибавте либо отнимите промежуток времени при помощи кнопок ниже,' +
            ' иначе нажмите "Готово" если указанное время Вас устраивает'
    ;
    let step = (type === "start") ? "6" : "8";
    addMainMenu(ctx, "Шаг № " + step).then(result => {
        ctx.reply(text, {
            reply_markup: {
                "inline_keyboard": [
                    [
                        {text: " - 3 часа", callback_data: val + "_minus_3chas"},
                        {text: time, callback_data: "not_action"},
                        {text: " + 3 часа", callback_data: val + "_plus_3chas"}

                    ],
                    [
                        {text: " - 1 час", callback_data: val + "_minus_chas"},
                        {text: " + 1 час", callback_data: val + "_plus_chas"}
                    ],
                    [
                        {text: " - 30 мин", callback_data: val + "_minus_30min"},
                        {text: " + 30 мин", callback_data: val + "_plus_30min"}
                    ],
                    [{text: "Готово", callback_data: "timePicker_quit_" + type}]
                ]
            },
            parse_mode: 'html'
        }).then(result => {
            if (result.message_id) {
                userSessions.setSessionSendedMessage(ctx, result.message_id);
            }
        });
    });
}

function recalcTimePicker(ctx) {
    let cData = ctx.update.callback_query.data;
    let splitData = cData.split("_");
    let nowOrderTime = userSessions.getOrderTime(ctx, splitData[1]);
    if (!nowOrderTime) return false;
    let splitPickerTime = nowOrderTime.split(':');
    let hoursSplit = splitPickerTime[0];
    let minutsSplit = splitPickerTime[1];
    switch (splitData[2]) {
        case "minus":
            switch (splitData[3]) {
                case "3chas":
                    hoursSplit = +hoursSplit - 3;
                    if (hoursSplit < 0) {
                        hoursSplit = 24 + hoursSplit; //+ потому что - и - дают плюс а число с минусом поэтому ставим плюс
                    }
                    break;
                case "chas":
                    if (hoursSplit === "00" || hoursSplit === "0") {
                        hoursSplit = "23";
                    } else {
                        hoursSplit = +hoursSplit - 1;
                    }
                    break;
                case "30min":
                    if (minutsSplit === "00") {
                        if (hoursSplit === "00" || hoursSplit === "0") {
                            hoursSplit = "23";
                        } else {
                            hoursSplit = +hoursSplit - 1;
                        }
                        minutsSplit = "30";
                    } else {
                        minutsSplit = "00";
                    }
                    break;
            }
            break;
        case "plus" :
            switch (splitData[3]) {
                case "3chas":
                    hoursSplit = +hoursSplit + 3;
                    if (hoursSplit === 24) hoursSplit = "00";
                    if (hoursSplit > 24) {
                        hoursSplit = +hoursSplit - 24;
                    }
                    break;
                case "chas":
                    if (hoursSplit === "23") {
                        hoursSplit = "00";
                    } else {
                        hoursSplit = +hoursSplit + 1;
                    }
                    break;
                case "30min":
                    if (minutsSplit === "30") {
                        if (hoursSplit === "23") {
                            hoursSplit = "00";
                        } else {
                            hoursSplit = +hoursSplit + 1;
                        }
                        minutsSplit = "00";
                    } else {
                        minutsSplit = "30";
                    }
                    break;
            }
            break;
    }
    nowOrderTime = hoursSplit + ":" + minutsSplit;
    userSessions.setOrderTime(ctx, nowOrderTime, splitData[1]);
    sendOrderTimeChooser(ctx, splitData[1]);
}

function sendFreeNannies(ctx) {
    userSessions.deleteSessionMessages(ctx);
    let nanniesCount = userSessions.getCountNannies(ctx); //количество нянь
    let selectedNannies = userSessions.getSelectedNannies(ctx); //выбранные няни
    let epxNannies = selectedNannies.join(',');

    if (selectedNannies.length < nanniesCount) {
        let countChildren = userSessions.getCountChildren(ctx);
        let countBaby = userSessions.getCountMiniChildren(ctx);
        let query = "" +
            "SELECT nannies.id, nannies.biography, nannies.user_id, users.photo  FROM nannies " +
            "RIGHT JOIN users ON nannies.user_id = users.id " +
            "WHERE NOT EXISTS (" +
                " SELECT *" +
                " FROM nanny_orders " +
                " INNER JOIN norders ON nanny_orders.norder_id = norders.id " +
                " WHERE nanny_orders.nanny_id = nannies.id" +
                " AND norders.start BETWEEN '" + userSessions.getOrderFullTime(ctx, "start") +
                "' AND '" + userSessions.getOrderFullTime(ctx, "end") + "' " +
                " AND norders.end BETWEEN '" + userSessions.getOrderFullTime(ctx, "start") +
                "' AND '" + userSessions.getOrderFullTime(ctx, "end") + "' " +
            ") " +
            "AND EXISTS ( " +
                " SELECT * " +
                " FROM worktimes " +
                " WHERE worktimes.nanny_id = nannies.id " +
                " AND worktimes.start <= '" + userSessions.getOrderFullTime(ctx, "start") + "' " +
                " AND worktimes.end >= '" + userSessions.getOrderFullTime(ctx, "end") + "' "  +
            ")" +
            "AND nannies.hourly = 1 " +
            "AND nannies.id NOT IN (" + ((epxNannies) ? epxNannies : "0") + ") " +
            "" +
            "LIMIT 8";
        sequelize.query(query)
            .then(nannies => {
                    if (nannies) {
                        addMainMenu(ctx, "Шаг № 9").then(result => {
                            let toMes = '' +
                                '<b>Дата начала заказа</b>: \n' +
                                moment(userSessions.getOrderFullTime(ctx, "start")).format("dddd, D MMMM YYYY, HH:mm:ss") + "\n" +
                                '<b>Дата окончания заказа</b>: \n' +
                                moment(userSessions.getOrderFullTime(ctx, "end")).format("dddd, D MMMM YYYY, HH:mm:ss") + "\n" +
                                '<b>Количество детей</b>: ' + countChildren + "\n" +
                                '<b>Количество детей моложе 18мес.</b>: ' + countBaby + "\n" +
                                '<b>Сумма заказа: </b>' + userSessions.getSessionAmount(ctx) + " тг.\n" +
                                '<b>Необходимо нянь</b>: ' + nanniesCount + "\n" +
                                'Нужно выбрать еще <b>' + (nanniesCount - selectedNannies.length) + "</b> " +
                                (((nanniesCount - selectedNannies.length) === 1) ? "нянь." : "няни.") + "\n" +
                                'В выбранное время могут работать следующие няни:';
                            ctx.reply(toMes, {parse_mode:"html"}).then(
                                result => {
                                    if (result.message_id) {
                                        userSessions.setSessionSendedMessage(ctx, result.message_id);
                                    }
                                }
                            );
                            if(nannies.length < nanniesCount){
                                ctx.reply('К сожалению, мы не можем предоставить нужное количество нянь для выбраного времени. ' +
                                    'Предлагаем Вам сменить время брони, либо уменьшить количество детей в заказе.', {
                                    reply_markup: {
                                        inline_keyboard: [
                                            [
                                                {text: "Изменить время заказа", callback_data: "restart_time"},
                                                {text: "Изменить кол-во детей", callback_data: "restart_countChild"}
                                            ]
                                        ]
                                    }
                                }).then(result => {
                                    if (result.message_id) {
                                        userSessions.setSessionSendedMessage(ctx, result.message_id);
                                    }
                                });
                            }
                            nannies[0].forEach(function (item) {
                                ctx.replyWithPhoto({source: "../../www/supernanny.kz/app/webroot" + item.photo}, {
                                    caption: item.biography.substr(0, 140) + '...\n' + 'Посмотреть на сайте - http://supernanny.kz/' + item.id + '/',
                                    reply_markup: {
                                        inline_keyboard: [
                                            [{text: "Пригласить", callback_data: "chooseNanny_" + item.id}]
                                        ]
                                    },
                                    parse_mode:'html'
                                }).then(result => {
                                    if (result.message_id) {
                                        userSessions.setSessionSendedMessage(ctx, result.message_id);
                                    }
                                });
                            });
                        });
                    }
                }
            );
    }else{
        if(userSessions.testSession(ctx)){
            sentPayment(ctx);
        }else{
            addMainMenu(ctx, "Шаг № 9").then(result => {
                ctx.reply('Ошибка проверки сессии, начните заказ сначала'
                    ).then(
                    result => {
                        if (result.message_id) {
                            userSessions.setSessionSendedMessage(ctx, result.message_id);
                        }
                    }
                );
            });
        }
    }
}


function sentPayment(ctx) {
    userSessions.deleteSessionMessages(ctx);
    addMainMenu(ctx, 'Шаг № 10').then(result => {
        ctx.reply('Выберите удобный для Вас способ оплаты', {
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: "Банковской картой", callback_data: "payment_bankCard"},
                        {text: "Qiwi терминал", callback_data: "payment_qiwi"}
                    ]
                ]
            }
        }).then(result => {
            if (result.message_id) {
                userSessions.setSessionSendedMessage(ctx, result.message_id);
            }
        });
    });
}

function saveOrderStartPay(ctx, type) {
    userSessions.deleteSessionMessages(ctx);
    let session = userSessions.getSession(ctx);
    User.findOrCreate({
        where: {
            phone: {
                [Op.like]: '%' + session.phone
            }
        },
        defaults: {
            phone: "+7" + session.phone,
            name: (session.firstName) ? session.firstName : "",
            lastname: (session.lastName) ? session.lastName : "",
            role: 'user',
            created_at: new Date(),
            updated_at: new Date(),
            telegram_id: session.telegram_id
        }
    }).spread((user) => {
        if (user) {
            Order.create({
                user_id: user.id,
                created: moment().utcOffset(360),
                status: 0,
                option: (type === "qiwi") ? "qiwi" : "kkb",
                sum: session.amount,
                paket: "Почасовая няня"
            }).then(order => {
                if (order) {
                    NOrder.create({
                        user_id: user.id,
                        start: moment(userSessions.getOrderFullTime(ctx, "start")),
                        end: moment(userSessions.getOrderFullTime(ctx, "end")),
                        is_confirmed: 0,
                        is_payed: 0,
                        created_at: moment().utcOffset(360),
                        updated_at: moment().utcOffset(360),
                        child_count: session.countChildren,
                        amount: session.amount,
                        payed_type: type,
                        order_id: order.id,
                        babies: session.countMiniChildren
                    }).then(norderR => {
                        if (norderR) {
                            session.selectedNannies.forEach(function(item){
                                NannyOrder.create({
                                    nanny_id: item,
                                    norder_id: norderR.id
                                });
                            });
                            let systemTypeM = (type === "qiwi") ? "QIWI терминал" : "банковская карта";
                            let message = 'Ваш заказ № <b>' + norderR.id + '</b> сохранен, но не оплачен.\n' +
                                '<b>Сумма к оплате:</b> ' + norderR.amount + '  тг. \n' +
                                '<b>Дата начала заказа:</b> ' + moment(norderR.start).format("dddd, D MMMM YYYY, HH:mm:ss") + '\n' +
                                '<b>Дата окончания заказа:</b> ' + moment(norderR.end).format("dddd, D MMMM YYYY, HH:mm:ss") + '\n' +
                                '<b>Количество детей:</b> ' + norderR.child_count + '\n' +
                                '<b>Количество нянь:</b> ' + session.countNannies + '\n' +
                                '<b>Система оплаты:</b> ' + systemTypeM + '\n';
                            let howPayMessage = (type === "qiwi") ? "Инструкция к оплате...\n" : "Для продолжения оплаты перейдите по ссылке: http://supernanny.kz" +
                                "/payments/telegram/payorder?phone=" + session.phone + "&order=" + norderR.id + " \n";
                            let postMessage = "Для просмотра своих заказов нажмите кнопку:\n \"🗓 Мои заказы\"";
                            message = message + howPayMessage + postMessage;
                            ctx.reply(message, {
                                parse_mode: "HTML",
                                reply_markup: {
                                    resize_keyboard: true,
                                    keyboard: [
                                        [{text: "🗓 Мои заказы"}, {text: "🕰 Заказать няню"}],
                                        [{text: "👩‍👦‍👦 Для няни"}, {text: "☎️ Контакты"}]
                                    ]
                                }
                            });
                            userSessions.setSessionType(ctx, null);
                        }
                    });
                    let need_save = false;
                    if (!user.telegram_id) {
                        user.telegram_id = session.telegram_id;
                        need_save = true;
                    }
                    if (!user.name) {
                        user.name = (session.firstName) ? session.firstName : "";
                        need_save = true;
                    }
                    if (!user.lastname) {
                        user.lastname = (session.lastname) ? session.lastname : "";
                        need_save = true;
                    }
                    if (need_save) {
                        user.save();
                    }
                }
            });
        }
    });
}


bot.startPolling();
