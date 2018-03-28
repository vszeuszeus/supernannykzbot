const moment = require('moment');

const amount = require('./amountCalculator');

let a = new amount(3,2, "2018-04-12 08:00:00", "2018-04-24 17:00:00").getResults();
let b = new amount(8,2, "2018-04-12 08:00:00", "2018-04-24 17:00:00").getResults();
console.log(a);
console.log(b);
console.log(a);



