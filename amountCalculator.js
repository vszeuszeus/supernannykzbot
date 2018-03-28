const moment = require('moment');

module.exports = function (children, babies, start, end){

    const priceDayX2 = 1800;
    const priceDayX3 = 2000;

    const priceNightX2 = 2000;
    const priceNightX3 = 2500;

    this.children = children - babies;
    this.babies = babies;
    this.start = moment(start);
    console.log("this start - " + this.start);
    this.end = moment(end);
    console.log("this end" + this.end);
    this.hours = ((this.end - this.start) / (1000 * 60 * 60));
    console.log("this hours - " + this.hours);
    this.startDay = this.start.get('day');
    this.endDay = this.end.get('day');
    this.finalAmount = 0;
    this.finalDayHours = 0;
    this.finalNightHours = 0;
    this.calcHoursByOneDay = function(start, end){
        let dayHours = 0;
        let nightHours = 0;
        if(start && end){
            let differenceHours = (end - start) / (1000 * 60 * 60);
            let startTimeHours = (start.hour() + ((start.minute() > 0) ? 0.5 : 0));
            let endTimeHours = (end.hour() + ((end.minute() > 0) ? 0.5 : 0));
            if(startTimeHours < 21 && startTimeHours >= 9){
                dayHours = (21 - startTimeHours) - ((endTimeHours < 21 && endTimeHours >= 9) ? (21 - endTimeHours) : 0);
                nightHours = differenceHours - dayHours;
            }else{
                dayHours = (9 - startTimeHours) - ((endTimeHours >= 21 || endTimeHours < 9) ? (9 - endTimeHours) : 0);
                if(dayHours > 12){
                    dayHours -= dayHours - 12;
                    nightHours = differenceHours - dayHours;
                }else{
                    nightHours = dayHours;
                    dayHours = differenceHours - nightHours;
                }
            }
        }else{
            if(start){
                let startTimeHours = (start.hour() + ((start.minute() > 0) ? 0.5 : 0));
                if(startTimeHours < 21 && startTimeHours >= 9){
                    dayHours = 21 - startTimeHours;
                    nightHours = 3;
                }
                if(startTimeHours < 9){
                    dayHours = 12;
                    nightHours = 12 - startTimeHours;
                }
                if(startTimeHours >= 21){
                    dayHours = 0;
                    nightHours = 24 - startTimeHours;
                }
            }else{
                if(end){
                    let endTimeHours = (end.hour() + ((end.minute() > 0) ? 0.5 : 0));
                    if(endTimeHours < 21 && endTimeHours >= 9){
                        nightHours = 9;
                        dayHours = endTimeHours - 9;

                    }
                    if(endTimeHours < 9){
                        dayHours = 0;
                        nightHours = endTimeHours;
                    }
                    if(endTimeHours >= 21){
                        dayHours = 12;
                        nightHours = 9 + (endTimeHours - 21);
                    }
                }
            }
        }
        return {
            dayHours: dayHours,
            nightHours: nightHours,
            allHours: dayHours + nightHours
        }
    };
    this.getResults = function(){
        if(this.startDay === this.endDay){
            //даты в одиних сутках
            let object = this.calcHoursByOneDay(this.start, this.end);
            this.finalDayHours = object.dayHours;
            this.finalNightHours = object.nightHours;
        }else{
            let firstDayHours = this.calcHoursByOneDay(this.start, false);
            let lastDayHours = this.calcHoursByOneDay(false, this.end);
            let otherHours = this.hours - firstDayHours.allHours - lastDayHours.allHours;
            console.log("this hours - " + this.hours);
            console.log("other hours - " + otherHours);
            let otherDays = 0;
            if((otherHours) >= 24){
                otherDays = otherHours / 24;
            }
            console.log("other dayes -" + otherDays);
            this.finalDayHours = firstDayHours.dayHours + lastDayHours.dayHours + (12 * otherDays);
            this.finalNightHours = firstDayHours.nightHours + lastDayHours.nightHours + (12 * otherDays);
        }
        let finalAmount = (this.finalDayHours * this.babies * priceDayX2) + (this.finalNightHours * this.babies * priceNightX2);
        console.log('final Days H - ' + this.finalDayHours);
        console.log("final Nights H - " + this.finalNightHours);
        console.log("finalAmount - " + finalAmount);
        let amountGroups = [];
        let childMod = this.children % 3;
        let childDiff = this.children / 3;
        switch(childMod){
            case 0:
                for(let i = 0; i < childDiff; i++){
                    amountGroups.push(3);
                }
                break;
            case 1:
                let nowFloor = (Math.floor(childDiff) - 1);
                for(let i = 0; i < nowFloor; i++){
                    amountGroups.push(3);
                }
                amountGroups.push(2 , 2);
                break;
            case 2:
                for(let i = 0; i < (Math.floor(childDiff)); i++){
                    amountGroups.push(3);
                }
                amountGroups.push(2);
                break;
        }
        let vm = this;
        amountGroups.forEach(function (item) {
            if(item === 3){
                finalAmount += (vm.finalDayHours * priceDayX3) + (vm.finalNightHours *  priceNightX3);
            }else{
                finalAmount += (vm.finalDayHours * priceDayX2) + (vm.finalNightHours *  priceNightX2);
            }
        });

        this.finalAmount = finalAmount;
        return finalAmount;
    }
};

