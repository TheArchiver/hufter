var mongoose = require('mongoose');
var moment = require('moment-timezone');
require('moment-range');
var YFquotes = require('./quotes');

var quoteSchema = mongoose.Schema({
  symbol: String,
  lastTradePrice: Number,
  timestamp: Number
});

var Quote = mongoose.model('Quote', quoteSchema);

var save = function(stocks){
  var currentTime = moment().tz('America/New_York');
  var openTime = moment().tz('America/New_York').hours(9).minutes(30).seconds(0);
  var closeTime = moment().tz('America/New_York').hours(16).minutes(0).seconds(0);
  var tradingHours = moment.range(openTime, closeTime)

  var db = mongoose.connection;

  if (currentTime.within(tradingHours)){
    db.on('error', console.error.bind(console, 'connection error:'));

    if (db.readyState === 1) {
      stocks.forEach(function(stock){
        if (stock["LastTradePriceOnly"]) {
          var currentQuote = new Quote({
                                          symbol: stock["Symbol"],
                                          lastTradePrice: stock["LastTradePriceOnly"],
                                          timestamp: new Date().getTime()
                                      });

          currentQuote.save(function(err, quote){
            if (err){
              console.log(err);
            } else {
              console.log("Quote for", quote.symbol, "saved at", moment().format('lll'));
            }
          });
        } else {
          console.log("Could not save trade data for ", stock["Symbol"], " at ", moment().format('lll'), "(", moment().tz('America/New_York').format('lll'), "market time )");
        }
      });
    }


  } else {
    console.log("Outside current trade hours. Disconnecting from database at", moment().format('lll'), "(", moment().tz('America/New_York').format('lll'), "market time )");
    mongoose.disconnect();
  }
}



module.exports = save;