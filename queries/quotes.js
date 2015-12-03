var _ = require('ramda');
var needle = require('needle');


var getStockData = function (symbols, metrics){
  var response = {};

  symbols = parseSymbols(symbols);
  metrics = parseMetrics(metrics);

  var fullQuery = buildQuery(symbols, metrics);

  // Error checking - all fields except symbol are null

  return new Promise(function(resolve, reject){
    needle.get(fullQuery, function(err, res){
      if (err) reject(err);
      var response = {};
      var stockData = res.body["query"]["results"]["quote"];
      response.ResolutionTime = res.body["query"]["diagnostics"]["user-time"];

      if (_.type(stockData) === "Array"){
        response = _.merge(response, checkInvalid(stockData));
        resolve(response);
      } else {
        if (noResult(stockData)){
          reject(`No quote information found for ticker ${symbols}`)
        } else {
          response = _.merge(response, { "results": stockData });
          resolve(response);
        }
      }
    });
  });
};

function parseSymbols(symbols){
  if (!symbols) { symbols = 'SPY' }
  else if (_.type(symbols) === "Array") { symbols = symbols.join('","') }
  return symbols;
}

function parseMetrics(metrics){
  if (!metrics) { metrics = '*' }
  else if (_.type(metrics) === "String") { metrics = metrics + ", Symbol"}
  else if (_.type(metrics) === "Array") { metrics = metrics.concat("Symbol").join(',') }
  return metrics;
}

function buildQuery(symbols, metrics){
  var rootPath = 'https://query.yahooapis.com/v1/public/yql?q=';
  var query = 'select ' + metrics + ' from yahoo.finance.quotes where symbol in ("' + symbols + '")';
  var extraParams = '&format=json&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys';
  return rootPath + encodeURIComponent(query) + extraParams;
}

function noResult(stockResult){
  var elimSymbol = dataSet => _.pipe(Object.keys, _.reject(_.equals('Symbol')), _.pick(_.__, dataSet))
  var getVals = obj => _.map((key) => obj[key], Object.keys(obj));
  var checkAllNull = _.all(_.equals(null));
  return _.pipe(elimSymbol(stockResult), getVals, checkAllNull)(stockResult);
}

function checkInvalid(stockData){
  var invalidSymbols = [];
  var parsedResult = {};

  stockData.forEach(function(stock){
    if (noResult(stock)) {
      invalidSymbols.push(stock["Symbol"]);
    }
  });
  if (!_.isEmpty(invalidSymbols)){
    parsedResult["results"] = _.reject((stock) => _.contains(stock["Symbol"], invalidSymbols), stockData);
    parsedResult.tickerError = `No quote information found for ticker ${invalidSymbols.join(", ")}`;
    if (_.isEmpty(parsedResult["results"])) delete parsedResult["results"];
  } else {
    parsedResult["results"] = stockData;
  }
  return parsedResult;
}

getStockDatawithOptions = _.curry(getStockData);

module.exports.getStockData = getStockData;
module.exports.getAllData = getStockDatawithOptions(_.__, null);
module.exports.getLastTrade = getStockDatawithOptions(_.__, "LastTradePriceOnly");
module.exports.getVolume = getStockDatawithOptions(_.__, "Volume");
module.exports.getLastTradeWithVolume = getStockDatawithOptions(_.__, ["LastTradePriceOnly", "Volume"])
module.exports.getAverageDailyVolume = getStockDatawithOptions(_.__, "AverageDailyVolume")



