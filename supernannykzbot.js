//const Telegrambot = require('node-telegram-bot-api');
const Telegraf = require('telegraf');
const Sequelize = require('sequelize');
const Calendar = require('telegraf-calendar-telegram');

//const token = "494928840:AAHD8Aiven5HcWQf-9k2WLQsv5S8WStITi0";
const token = "497454060:AAHiV3SLyh5uNs21ifikpzwfOWMLAyHjfN8";

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
const password = "123";
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
    name: Sequelize.STRING,
    lastname: Sequelize.STRING,
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
    end: Sequelize.DATE,
    is_payed: Sequelize.INTEGER,
    is_confirmed: Sequelize.INTEGER,
    created_at: Sequelize.DATE,
    updated_at: Sequelize.DATE,
    child_count: Sequelize.INTEGER,
    child_ages: Sequelize.STRING(20),
    payed_type: Sequelize.STRING(30)
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

Nanny.hasMany(NannyOrders, {foreignKey: "nanny_id", as: "orders"});
NannyOrders.belongsTo(Nanny, {foreignKey: "nanny_id"});
Nanny.belongsTo(User, {foreignKey: "user_id"});

//END MODELS


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
        console.log("-------------------");
        console.log(session);
        if (session) {
            if (
                session.telegram_id &&
                session.city &&
                session.nanny_id &&
                session.offer &&
                session.phone &&
                session.countChildren &&
                session.childrenYears &&
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
            console.log(userSessions);
        } else {
            return false;
        }
    },
    setSessionOffer: function (ctx, offer = false) {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            userSessions[chat_id].offer = offer;
        } else {
            return false;
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
    setChildYear: function (ctx, year = 0) {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            userSessions[chat_id].childrenYears.push(year);
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
    setOrderNanny: function (ctx, nanny_id) {
        let chat_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
        if (userSessions.hasOwnProperty(chat_id)) {
            userSessions[chat_id].nanny_id = nanny_id;
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
    }
};

let NewUserSession = function (ctx) {
    this.telegram_id = (ctx.update.callback_query) ? ctx.update.callback_query.message.chat.id : ctx.update.message.chat.id;
    this.userId = null;
    this.firstName = null;
    this.lastName = null;
    this.phone = null;
    this.city = null;
    this.offer = null;
    this.nanny_id = null;
    this.saved = false;
    this.sendedMessages = [];
    this.countChildren = null;
    this.childrenYears = [];
    this.sessionType = null;
    this.order = {
        startDate: null,
        endDate: null,
        startTime: null,
        endTime: null,
        nowType: null
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
    return ctx.reply('Список Ваших заказов пуст!');
});

function exit(ctx) {
    userSessions.deleteSessionMessages(ctx);
    userSessions.deleteSession(ctx);
}

bot.hears('Отмена', (ctx) => sendQuestionRestart(ctx));

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
            console.log('asdasd');
    }
});

bot.on('callback_query', (ctx) => {
    console.log(userSessions);
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
            userSessions.setCountChildren(ctx, +splitData[1]);
            sendChildYears(ctx, +splitData[1], 0);
            break;

        case "yearChild":
            let count = userSessions.getCountChildren(ctx);
            userSessions.setChildYear(ctx, +splitData[2]);
            if (splitData[1] == count) {
                console.log(userSessions);
                sendOrderDateChooser(ctx, "start");
            } else {
                sendChildYears(ctx, count, +splitData[1]);
            }
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
                            sendFreeNannies(ctx);
                        } else {
                            sendOrderDateChooser(ctx, "end", "Выбрано некорректное время! Конечное время бронирования должо быть большее начального времени не менее чем на час.");
                        }
                }
            }
            break;

        case "chooseNanny":
            userSessions.setOrderNanny(ctx, splitData[1]);
            console.log(userSessions);
            if (userSessions.testSession(ctx)) {
                sentPayment(ctx);
            } else {
                console.log("testSessionFalse");
            }
            break;

        case "payment":
            switch (splitData[1]) {
                case "bankCard":
                    break;
                case "qiwi":
                    saveQiwiOrder(ctx);
                    break;
            }
            break;

        case "restart":
            switch (splitData[1]) {
                case "sendOffer":
                    sendOffer(ctx);
                    break;
            }
            break;

        case "mainMenu":
            userSessions.deleteSessionMessages(ctx);
            sendMenu(ctx);
            break;

        default:
            console.log('good');
            break;
    }

});

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
            if (result >= 1) {
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
        ctx.reply('Перед тем как выбрать няню, необходимо принять условия публичной оферты.', {
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

function sendQuestionNanny(ctx) {
    userSessions.deleteSessionMessages(ctx);
    return ctx.reply('Вы являетесь няней на сайте http://supernanny.kz ?', {
        "reply_markup": {
            "inline_keyboard": [
                [{text: "Да", callback_data: "iAmNanny_yes"}],
                [{text: "Нет", callback_data: "iAmNanny_no"}]]
        }
    }).then(result => {
        if (result.message_id) {
            userSessions.setSessionSendedMessage(ctx, result.message_id);
        }
    });
}

function sendNannyGiveContact(ctx) {
    userSessions.deleteSessionMessages(ctx);
    return ctx.reply('Отлично. Следующая кнопка запросит Ваши контактные данные, чтобы завершить регистрацию в боте и отсылать Вам уведомления о заказах.', {
        one_time_keyboard: true,
        reply_markup: {
            keyboard: [
                [{text: "Поделиться контактными данными", request_contact: true}],
                [{text: "Отмена"}]]
        }
    }).then(result => {
        if (result.message_id) {
            userSessions.setSessionSendedMessage(ctx, result.message_id);
        }
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
                    [{text: "Алмата", callback_data: "needCity_Almata"}]]
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
        ctx.reply('Для какого количества детей Вам нужна няня?', {
            "reply_markup": {
                "inline_keyboard": [
                    [{text: "1", callback_data: "countChildren_1"}],
                    [{text: "2", callback_data: "countChildren_2"}],
                    [{text: "3", callback_data: "countChildren_3"}]
                ],
            }
        }).then(result => {
            if (result.message_id) {
                userSessions.setSessionSendedMessage(ctx, result.message_id);
            }
        });
    });
}

function sendChildYears(ctx, countChildren = 1, childChoosed = 0) {
    userSessions.deleteSessionMessages(ctx);
    console.log();
    let nowChildChoos = childChoosed + 1;
    console.log(nowChildChoos);
    let message = (countChildren > 1) ? "Шаг № 4 (Ребенок № " + nowChildChoos + ")" : "Шаг № 4 ";
    let nameChild = "";
    switch (nowChildChoos) {
        case 1:
            if (countChildren > 1) {
                nameChild = "первого ";
            } else {
                nameChild = "";
            }
            break;
        case 2:
            nameChild = "второго ";
            break;
        case 3:
            nameChild = "третьего ";
            break;
    }

    if (childChoosed < countChildren) {
        addMainMenu(ctx, message).then(result => {
            ctx.reply('Выберите возвраст ' + nameChild + "ребенка", {
                "reply_markup": {
                    "inline_keyboard": [
                        [
                            {text: "0", callback_data: "yearChild_" + nowChildChoos + "_" + "0"},
                            {text: "1", callback_data: "yearChild_" + nowChildChoos + "_" + "1"},
                            {text: "2", callback_data: "yearChild_" + nowChildChoos + "_" + "2"},
                            {text: "3", callback_data: "yearChild_" + nowChildChoos + "_" + "3"},
                            {text: "4", callback_data: "yearChild_" + nowChildChoos + "_" + "4"},
                            {text: "5", callback_data: "yearChild_" + nowChildChoos + "_" + "5"},
                        ],
                        [
                            {text: "6", callback_data: "yearChild_" + nowChildChoos + "_" + "6"},
                            {text: "7", callback_data: "yearChild_" + nowChildChoos + "_" + "7"},
                            {text: "8", callback_data: "yearChild_" + nowChildChoos + "_" + "8"},
                            {text: "9", callback_data: "yearChild_" + nowChildChoos + "_" + "9"},
                            {text: "10", callback_data: "yearChild_" + nowChildChoos + "_" + "10"}
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
}

function sendOrderDateChooser(ctx, type = "start", error = "") {
    userSessions.deleteSessionMessages(ctx);
    let message = null;
    let preMessage = "\n*Дата бронирования должна опережать текущее время не меньше чем на 3 часа.";
    switch (type) {
        case "start":
            message = "В какое время Вам необходима няня? \n1. День с 9:00-19:00 1500-2000т.\n" +
                "2. Вечер 2000-2500т.\n3. Ночь 2500т.\nПожалуйста, выберите в календаре начальную дату бронирования" + preMessage;
            break;
        case "end":
            message = "Выберите конечную дату бронирования. \nНачальная дата - " + userSessions.getOrderFullTime(ctx, "start");
            break;
    }
    userSessions.setOrderNowType(ctx, type);
    if (error) {
        let newError = "Ошибка: " + error + "\n";
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
    let text = (type === "start") ? 'Задайте начальное время брони' : 'Задайте конечное время брони';
    let step = (type === "start") ? "6" : "8";
    addMainMenu(ctx, "Шаг № " + step).then(result => {
        ctx.reply(text, {
            "reply_markup": {
                "inline_keyboard": [
                    [
                        {text: " - 1 час", callback_data: val + "_minus_chas"},
                        {text: time, callback_data: "timePicker_quit_" + type},
                        {text: " + 1 час", callback_data: val + "_plus_chas"}
                    ],
                    [
                        {text: " - 30 мин", callback_data: val + "_minus_30min"},
                        {text: " + 30 мин", callback_data: val + "_plus_30min"}
                    ],
                    [{text: "Готово", callback_data: "timePicker_quit_" + type}]
                ]
            }
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
    sequelize.query('' +
        "SELECT nannies.id, nannies.biography, nannies.user_id  FROM nannies " +
        "WHERE NOT EXISTS (" +
        " SELECT * " +
        " FROM nanny_orders " +
        " WHERE nanny_orders.nanny_id = nannies.id " +
        " AND nanny_orders.start BETWEEN '" + userSessions.getOrderFullTime(ctx, "start") +
        "' AND '" + userSessions.getOrderFullTime(ctx, "end") + "' " +
        " AND nanny_orders.end BETWEEN '" + userSessions.getOrderFullTime(ctx, "start") +
        "' AND '" + userSessions.getOrderFullTime(ctx, "end") + "' " +
        ") " +
        "LIMIT 3 ")
        .then(nannies => {
            if (nannies) {
                addMainMenu(ctx, "Шаг № 9").then(result => {
                    ctx.reply('В выбранное время могут работать следующие няни:').then(
                        result => {
                            if (result.message_id) {
                                userSessions.setSessionSendedMessage(ctx, result.message_id);
                            }
                        }
                    );
                    nannies[0].forEach(function (item) {
                        ctx.replyWithPhoto({source: "image.jpeg"}, {
                            caption: item.biography.substr(0, 197) + "...",
                            reply_markup: {
                                inline_keyboard: [
                                    [{text: "Заказать", callback_data: "chooseNanny_" + item.id}]
                                ]
                            }
                        }).then(result => {
                            if (result.message_id) {
                                userSessions.setSessionSendedMessage(ctx, result.message_id);
                            }
                        });
                    });
                });
            }
        });
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

function saveQiwiOrder(ctx) {
    userSessions.deleteSessionMessages(ctx);
    let session = userSessions.getSession(ctx);
    console.log(session);
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
    })
        .spread((user) => {
            if(user){
                let ages = "";
                session.childrenYears.forEach(function(item){
                    if(ages === ""){
                        ages = item;
                    }else{
                        ages = ages + "," + item;
                    }
                });
                NannyOrders.create({
                    user_id: user.id,
                    nanny_id: session.nanny_id,
                    start: userSessions.getOrderFullTime(ctx, "start"),
                    end: userSessions.getOrderFullTime(ctx, "end"),
                    is_confirmed: 0,
                    is_payed: 0,
                    created_at: new Date(),
                    updated_at: new Date(),
                    child_count: session.countChildren,
                    child_ages: ages,
                    payed_type: "qiwi"
                }).then(order=> {
                    console.log(order);
                    ctx.reply('Ваш заказ сохранен. но еще не оплачен.\nСумма к оплате: ***\n' +
                        'Инструкция к оплате...\n' +
                        'Для просмотра своих заказов нажмите кнопку "🗓 Мои заказы"', mainMenuKeyboard);
                    ctx.setSessionType(ctx, null);
                });
            }
        });

}

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

