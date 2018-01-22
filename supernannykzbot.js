//const Telegrambot = require('node-telegram-bot-api');
const Telegraf = require('telegraf');
const Sequelize = require('sequelize');
const Calendar = require('telegraf-calendar-telegram');

const token = "494928840:AAHD8Aiven5HcWQf-9k2WLQsv5S8WStITi0";

//const bot = new Telegrambot(token, {polling: true}); telegram-bot-api
const bot = new Telegraf(token);

const calendar = new Calendar(bot, {
    startWeekDay: 1,
    weekDayNames: ["П", "В", "С", "Ч", "П", "С", "В"],
    monthNames: [
        "Янв", "Фев", "Мар", "Апр", "Май", "Июнь",
        "Июль", "Авг", "Сен", "Окт", "Ноя", "Дек"
    ]
});

const database = "supernanny";
const user = "root";
const password = "s12q!Bza";
const host = "localhost";

const sequelize = new Sequelize(database, user, password, {
    host: host,
    port: 3306,
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
    role: Sequelize.ENUM('user', 'nanny', 'admin'),
    created_at: Sequelize.DATE,
    updated_at: Sequelize.DATE,
    telegram_id: Sequelize.BIGINT
});

const NannyOrders = sequelize.define('nanny_orders', {
    id:
        {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
    user_id: Sequelize.INTEGER.UNSIGNED,
    nanny_id: Sequelize.INTEGER.UNSIGNED,
    start: Sequelize.DATE,
    end: Sequelize.DATE
});

const Nanny = sequelize.define('nannies', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: Sequelize.INTEGER.UNSIGNED,
    biography: Sequelize.TEXT
});

Nanny.hasMany(NannyOrders, {foreignKey: "nanny_id", as : "orders"});
NannyOrders.belongsTo(Nanny, {foreignKey: "nanny_id"});
Nanny.belongsTo(User, {foreignKey: "user_id"});

//END MODELS



let userOrders = {
    setOrder : function (newNannyOrder) {
        if(!userOrders.hasOwnProperty(newNannyOrder.telegram_id)){
            userOrders[newNannyOrder.telegram_id] = newNannyOrder;
        } else {
            return false;
        }
    },
    setOrderStartDate: function (ctx, date) {
        if(userOrders.hasOwnProperty(ctx.update.callback_query.message.chat.id)) {
            userOrders[ctx.update.callback_query.message.chat.id].order.startDate = date;
        } else {
            return false;
        }
    },
    getOrderTime: function(ctx, type = "start") {
        if(userOrders.hasOwnProperty(ctx.update.callback_query.message.chat.id)){
            return userOrders[ctx.update.callback_query.message.chat.id].order[type + "Time"];
        } else {
            return false;
        }
    },
    setOrderTime: function(ctx, time, type = "start"){
        if(userOrders.hasOwnProperty(ctx.update.callback_query.message.chat.id)) {
            userOrders[ctx.update.callback_query.message.chat.id].order[type + "Time"] = time;
        } else {
            return false;
        }
    },
    getOrderFullTime: function(ctx, type = "start") {
        if(userOrders.hasOwnProperty(ctx.update.callback_query.message.chat.id)){
            return userOrders[ctx.update.callback_query.message.chat.id].order.startDate
                + " " + userOrders[ctx.update.callback_query.message.chat.id].order[type + "Time"];
        } else {
            return false;
        }
    },
    setOrderNanny: function (ctx, nanny_id) {
        if(userOrders.hasOwnProperty(ctx.update.callback_query.message.chat.id)){
            userOrders[ctx.update.callback_query.message.chat.id].nanny_id = nanny_id;
        } else {
            return false;
        }
    }
};


let NewNannyOrder = function (city, ctx, phone = null) {
    this.city = city;
    this.phone = phone;
    this.nanny_id = null;
    this.saved = false;
    this.offer = null;
    this.telegram_id = ctx.update.callback_query.message.chat.id;
    this.order = {
        startDate : null,
        endDate : null,
        startTime : null,
        endTime : null
    };


};

calendar.setDateListener((ctx, date) => {
    userOrders.setOrderStartDate(ctx, date);
    sendOrderTimeChooser(ctx, "start");
});

function sendCalendarStartDate(ctx) {
    return ctx.reply('Выберите пожалуйста начальный день бронирования', calendar.getCalendar());
}


bot.action('/^datePicker[.]+/g', (ctx) => {
    console.log('sdfsdf');
    return ctx.reply('Приветствие, запрос контактных данных!');
});

bot.on('callback_query', (ctx) => {
    let cData = ctx.update.callback_query.data;
    let splitData = cData.split('_');
    switch(splitData[0]) {
        case "giveNanny" :
            switch (splitData[1]) {
                case "yes" :
                    sendOffer(ctx);
                    break;
                case "no" :
                    sendQuestionNanny(ctx);
                    break;
            }
            break;

        case "offer" :
            switch (splitData[1]) {
                case "yes":
                    sendQuestionCity(ctx);
                    break;
            }
            break;

        case "needCity":
            switch (splitData[1]) {
                case "Astana":
                    userOrders.setOrder(new NewNannyOrder("Astana", ctx));
                    break;
                case "Almata":
                    userOrders.setOrder(new NewNannyOrder("Astana", ctx));
                    break;
            }
            sendOrderDateChooser(ctx);
            break;

        case "datePicker":
            console.log(userOrders);
            if (splitData[1] === "start" || splitData[1] === "end") {
                recalcTimePicker(ctx);
            }
            if(splitData[1] === "quit"){
                switch(splitData[2]){
                    case "start":
                        sendOrderTimeChooser(ctx, "end");
                        break;
                    case "end":
                        sendFreeNannies(ctx);
                }
            }
            break;

        case "chooseNanny":
            userOrders.setOrderNanny(ctx, splitData[1]);
            sentPayment(ctx);
            break;

        default:
            console.log('good');
            break;
    }

});

function sendOffer(ctx){
    deleteMessage(ctx);
    return ctx.reply('Перед тем как выбрать няню, просьба ознакомиться с публичной офертой.', {
        "reply_markup": {
            "inline_keyboard": [
                [{text: "Прочитал", callback_data: "offer_yes"}],
                [{text: "Отмена", callback_data: "cancel"}]]
        }
    });
}

function sendQuestionNanny(ctx){
    deleteMessage(ctx);
    return ctx.reply('Вы няня?.', {
        "reply_markup": {
            "inline_keyboard": [
                [{text: "Да", callback_data: "iAmNanny_yes"}],
                [{text: "Нет", callback_data: "iAmNanny_no"}]]
        }
    });
}

function sendQuestionCity(ctx) {
    deleteMessage(ctx);
    return ctx.reply('В каком городе вам нужна няня?', {
        "reply_markup": {
            "inline_keyboard": [
                [{text: "Астана", callback_data: "needCity_Astana"}],
                [{text: "Алмата", callback_data: "needCity_Almata"}]]
        }
    });
}

function sendOrderDateChooser(ctx){
    deleteMessage(ctx);
    return ctx.reply('В какое время Вам необходима няня? \n' +
        '1. День с 9:00-19:00 1500-2000т.\n' +
        '2. Вечер 2000-2500т.\n' +
        '3. Ночь 2500т.\n' +
        'Пожалуйста, выберите в календаре дату бронирования', calendar.getCalendar());
}

function sendOrderTimeChooser(ctx, type = "start"){
    deleteMessage(ctx);
    let time = null;
    if(userOrders.getOrderTime(ctx, type)) {
        time = userOrders.getOrderTime(ctx, type);
    } else {
        time = new Date().getHours() + ":00";
        userOrders.setOrderTime(ctx, time, type);
    }
    makeDatePicker(ctx, time, type);
}

function makeDatePicker(ctx, time, type = "start") {

    let val = (type === "start") ? "datePicker_start" : "datePicker_end";
    let text = (type === "start") ? 'Задайте начальное время брони' : 'Задайте конечное время брони' ;

    return ctx.reply(text, {
        "reply_markup": {
            "inline_keyboard": [
                [
                    {text: " - 1 час", callback_data: val + "_minus_chas"},
                    {text: time, callback_data: "datePicker_quit_" + type},
                    {text: " + 1 час", callback_data: val + "_plus_chas"}
                ],
                [
                    {text: " - 30 мин", callback_data: val +  "_minus_30min"},
                    {text: " + 30 мин", callback_data: val +  "_plus_30min"}
                ],
                [{text: "Готово", callback_data: "datePicker_quit_" + type}]
            ]
        }
    });
}

function recalcTimePicker(ctx){
    let cData = ctx.update.callback_query.data;
    let splitData = cData.split("_");
    let nowOrderTime = userOrders.getOrderTime(ctx, splitData[1]);
    if(!nowOrderTime) return false;
    let splitPickerTime = nowOrderTime.split(':');
    let hoursSplit = splitPickerTime[0];
    let minutsSplit = splitPickerTime[1];
    switch (splitData[2]) {
        case "minus":
            switch (splitData[3]) {
                case "chas":
                    if(hoursSplit === "00" || hoursSplit === "0"){
                        hoursSplit = "23";
                    } else {
                        hoursSplit = +hoursSplit  - 1;
                    }
                    break;
                case "30min":
                    if(minutsSplit === "00"){
                        if(hoursSplit === "00" || hoursSplit === "0"){
                            hoursSplit = "23";
                        } else {
                            hoursSplit = +hoursSplit  - 1;
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
                case "chas":
                    if(hoursSplit === "23"){
                        hoursSplit = "00";
                    } else {
                        hoursSplit = +hoursSplit + 1;
                    }
                    break;
                case "30min":
                    if(minutsSplit === "30"){
                        if(hoursSplit === "23"){
                            hoursSplit = "00";
                        } else {
                            hoursSplit = +hoursSplit  + 1;
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
    userOrders.setOrderTime(ctx, nowOrderTime, splitData[1]);
    sendOrderTimeChooser(ctx, splitData[1]);
}

function sendFreeNannies(ctx){
    deleteMessage(ctx);
    sequelize.query('' +
        "SELECT nannies.id, nannies.biography, nannies.user_id  FROM nannies " +
        "WHERE NOT EXISTS (" +
            " SELECT * " +
            " FROM nanny_orders " +
            " WHERE nanny_orders.nanny_id = nannies.id " +
            " AND nanny_orders.start BETWEEN '" + userOrders.getOrderFullTime(ctx, "start") +
                "' AND '" + userOrders.getOrderFullTime(ctx, "end") + "' " +
            " AND nanny_orders.end BETWEEN '" + userOrders.getOrderFullTime(ctx, "start") +
                "' AND '" + userOrders.getOrderFullTime(ctx, "end") + "' " +
        ") " +
        "LIMIT 3 ")
        .then(nannies => {
            nannies[0].forEach(function(item) {
                ctx.replyWithPhoto({source: "image.jpeg"} , {
                    caption : item.biography.substr(0, 197) + "...",
                    reply_markup: {
                        inline_keyboard: [
                            [{text: "Заказать", callback_data: "chooseNanny_" + item.id}]
                        ]
                    }

                });
            });

    });
}

function sentPayment(ctx) {
    ctx.reply('Для того, чтобы забронировать время няни вам необходимо оплатить. Следующие кнопки запросят Ваши контактные данные. Какой способ оплаты удобен для вас?', {
        reply_markup: {
            "one_time_keyboard": true,
            keyboard: [
                [{text: "Банковской картой", request_contact: true}, {text: "Qiwi терминал", request_contact: true}]
            ]
        }
    });
}

function deleteMessage(ctx){
    ctx.deleteMessage(ctx.update.callback_query.message.chat.id, ctx.update.callback_query.message.message_id);
}




bot.start((ctx) => {
    return ctx.reply('Здесь вы можете выбрать и пригласить бебиситтера с сервиса почасовых супернянь для своего' +
        ' ребенка от 0 до 10 лет. Наши суперняни отобраны, обучены, прошли медосмотр. Вы хотите пригласить почасовую суперняню?', {
        "reply_markup": {
            "inline_keyboard": [
                [{text: "Да", callback_data: "giveNanny_yes"}],
                [{text: "Нет", callback_data: "giveNanny_no"}]]
        }
    })
});





bot.on('contact', (ctx) => {
    console.log(ctx);
    console.log(ctx.message.contact);
    let phone = ctx.message.contact.phone_number.substr(ctx.message.contact.phone_number.length - 10);

    User.findOrCreate({
        where: {
            phone: {
                [Op.like]: '%' + phone
            }
        },
        defaults: {
            phone: "+7" + phone,
            role: "user",
            telegram_id: ctx.message.chat.id,
            created_at: new Date(),
            updated_at: new Date(),
        }
    })
        .spread((user) => {

            switch (user.role) {
                case 'user' :
                    ctx.reply('Начало оплаты');
                    break;
                case 'nanny' :
                    ctx.reply('Отлично, мы Вас уведомим, когда Вам поступят заявки');
                    break;
                case 'admin' :
                    ctx.reply('Вы админ');
                    break;
            }
        });
});




bot.startPolling();


/*bot.onText(/\/start/, (msg) => {

    bot.sendMessage(msg.chat.id, "Приветствие, запрос контактных данных", {
        "reply_markup": {
            "one_time_keyboard": true,
            "keyboard": [[{
                text: "Поделиться контактными данными",
                request_contact: true
            }], ["Отмена"]]
        }
    });
});

bot.on('contact', (msg) => {
    console.log(msg);
    let phone = msg.contact.phone_number.substr(msg.contact.phone_number.length - 10);
    try {
        User.findOne({
            where: {
                phone: {
                    [Op.like]: '%' + phone
                }
            }
        })
            .then(user => {
                if (user) {
                    console.log(user);
                    switch (user.role) {
                        case 'user' :
                            timeStepInit(msg);
                            break;
                        case 'nanny' :
                            bot.sendMessage(msg.chat.id, 'Отлично, мы Вас уведомим, когда Вам поступят заявки');
                            break;
                        case 'admin' :
                            bot.sendMessage(msg.chat.id, 'Вы админ');
                            break;
                    }
                } else {
                    console.log('');
                    timeStepInit(msg);
                }
            })
            .catch(error => {
                console.log('errorasdasd123123' + error);
            });
    }
    catch (error) {
        console.log('try eror23424::: ' + error);
    }

});

//stepOne - вывод запросы более или менее 24 часов
function stepOneInit(msg) {
    bot.sendMessage(msg.chat.id, "На какое количество часов вы хотите нанять Няню", {
        "reply_markup": {
            "inline_keyboard": [
                [{text: "Менее 24 часов", callback_data: "stepOne_menee24"}],
                [{text: "Более 24 часов", callback_data: "stepOne_bolee24"}]
            ]
        }
    });
}
function stepOneCallback(msg) {

}

/!*bot.onText(/Менее 24 часов/, (msg) => {
    console.log(msg);
    bot.sendMessage(msg.chat.id, "значит менее 24 ОК");
});*!/

bot.on('callback_query', (msg) => {
    console.log(msg);
    bot.deleteMessage(msg.message.chat.id, msg.message.message_id);
    try {

        let splited = msg.data.split('_');

        switch(splited[0]){
            case step1
        }


        let data = msg.data.substr(0, 10);
        console.log(data);

        if (data === "nannyOrder") {
            var splited = msg.data.split('_');
            console.log(splited);
            bot.sendPhoto(msg.message.chat.id, 'image.jpeg', {
                caption: "Вы выбрали няню № " + splited[1] + "Что приступить к оплате нажмите кнопку оплатить",
                reply_markup: {
                    inline_keyboard: [
                        [{text: "Оплатить", callback_data: "start_pay"}]
                    ]
                }
            });
        }
        switch (msg.data) {
            case "min24" :
                bot.sendPhoto(msg.message.chat.id, 'image.jpeg', {
                    caption: "description nanny # 1",
                    reply_markup: {
                        inline_keyboard: [
                            [{text: "Заказать", callback_data: "nannyOrder_1"}]
                        ]
                    }
                });
                bot.sendPhoto(msg.message.chat.id, 'image.jpeg', {
                    caption: "description nanny # 2",
                    reply_markup: {
                        inline_keyboard: [
                            [{text: "Заказать", callback_data: "nannyOrder_2"}]
                        ]
                    }
                });
                bot.sendMediaGroup(msg.message.chat.id, [
                    {type: "photo", media: "image.jpeg", caption: "nanny description"},
                    {type: "photo", media: "image.jpeg", caption: "nanny description"},
                    {type: "photo", media: "image.jpeg", caption: "nanny description"},
                ]);
                break;
            case "start_pay":
                bot.sendMessage(msg.message.chat.id, "Какую систему оплаты вы выбираете??", {
                    "reply_markup": {
                        "inline_keyboard": [
                            [{text: "QIWI", callback_data: "pay_by_qiwi"}],
                            [{text: "Оплата банковской картой", callback_data: "pay_by_card"}]
                        ]
                    }
                });
        }
    } catch (error) {
        console.log(error);
    }
});

function timeStep(msg) {
    bot.sendMessage(msg.chat.id, 'Переходим далее');
}*/

