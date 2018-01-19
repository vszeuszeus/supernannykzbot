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

const PrepareOrdersNanny = sequelize.define('prepare_orders_nanny', {
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
});
//END MODELS




let nanny_orders_array = {};
let pickerDates = {};

let NewNannyOrder = function (start_date = null, end_date = null, start_time = null, end_time = null) {
    this.start_date = start_date;
    this.end_date = end_date;
    this.start_time = start_time;
    this.end_time = end_time;
};

calendar.setDateListener((context, date) => {
    //console.log(context);
    console.log(context.update);
    //console.log(context);
    let orderNanny = nanny_orders_array[context.update.callback_query.message.chat.id];
    if (orderNanny) {
        orderNanny.end_date = date;
        console.log(nanny_orders_array);
        sendEndTimePicker(context);
    }
    else {
        nanny_orders_array[context.update.callback_query.message.chat.id] = new NewNannyOrder(date);
        console.log(nanny_orders_array);
        sendStartTimePicker(context);
    }
});

function sendCalendarStartDate(ctx) {
    return ctx.reply('Выберите пожалуйста начальный день бронирования', calendar.getCalendar());
}

function sendCalendarEndDate(ctx) {
    return ctx.reply('Выберите пожалуйста конечный день бронирования', calendar.getCalendar());
}

function sendStartTimePicker(ctx) {
    ctx.deleteMessage(ctx.update.callback_query.message.chat.id, ctx.update.callback_query.message.message_id);
    let start_time = nanny_orders_array[ctx.update.callback_query.message.chat.id].start_time;
    if(!start_time) {
        start_time = new Date().getHours() + ":00";
        nanny_orders_array[ctx.update.callback_query.message.chat.id].start_time = start_time;
    }
    makeDatePicker(ctx, start_time, "start");
}

function sendEndTimePicker(ctx) {
    ctx.deleteMessage(ctx.update.callback_query.message.chat.id, ctx.update.callback_query.message.message_id);
}


function makeDatePicker(ctx, time, option = "start") {

    let val = (option === "start") ? "datePicker_start" : "datePicker_end";
    let text = (option === "start") ? 'Задайте начальное время брони' : 'Задайте конечное время брони' ;

    return ctx.reply(text, {
        "reply_markup": {
            "inline_keyboard": [
                [
                    {text: " - 1 час", callback_data: val + "_minus_chas"},
                    {text: time, callback_data: "datePicker_quit"},
                    {text: " + 1 час", callback_data: val + "_plus_chas"}
                ],
                [{text: "Готово", callback_data: "datePicker_quit"},]
            ]
        }
    });
}

bot.action('/^datePicker[.]+/g', (ctx) => {
    console.log('sdfsdf');
    return ctx.reply('Приветствие, запрос контактных данных!');
});

bot.on('callback_query', (ctx) => {
    console.log(ctx);
});




bot.start((ctx) => {
    return ctx.reply('Приветствие, запрос контактных данных!', {
        "reply_markup": {
            "one_time_keyboard": true,
            "keyboard": [[{
                text: "Поделиться контактными данными",
                request_contact: true
            }], ["Отмена"]]
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
        .spread((user, created) => {

            switch (user.role) {
                case 'user' :
                    sendCalendarStartDate(ctx);
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

