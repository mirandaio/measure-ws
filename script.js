import WebSocket from 'ws';

// Open 1 empty websocket connection
const ws = new WebSocket('wss://stream.binance.com:9443/stream');
// const ws = new WebSocket('wss://stream.binance.com:9443/ws');

// 2 trade streams, 2 aggTrade streams, and 2 kline streams
const streams = [
  'btcusdt@trade',
  'bnbbtc@trade',
  'btcusdt@aggTrade',
  'bnbbtc@aggTrade',
  'btcusdt@kline_1s',
  'bnbbtc@kline_1s'
];

const initLatencyStats = (streams) => {
  const latencyStats = {};
  streams.forEach(stream => {
    latencyStats[stream] = {
      min: Number.POSITIVE_INFINITY,
      max: Number.NEGATIVE_INFINITY,
      count: 0,
      total: 0
    };
  });
  return latencyStats;
};

const latencyStats = initLatencyStats(streams);
let interval;

ws.on('open', () => {
  // live subscribe to 2 trade streams, 2 aggTrade streams, and 2 kline streams
  ws.send(JSON.stringify({
    method: 'SUBSCRIBE',
    params: streams,
    id: 1
  }));

  // Measure websocket latency for each stream and print min/max/avg every 1 minute
  interval = setInterval(() => {
    streams.forEach(stream => {
      console.log(`${new Date().toISOString()} ${stream}: min ${latencyStats[stream].min}ms, max ${latencyStats[stream].max}ms, avg ${Math.round(latencyStats[stream].total / latencyStats[stream].count)}ms`);
      // Clear count and total since if the script is run for a very long time,
      // count and total could overflow.
      // Could also reset min and max if we want the min and max within the last minute.
      latencyStats[stream].count = 0;
      latencyStats[stream].total = 0;
    });
  }, 60000);
});

ws.on('message', (data) => {
  const parsedData = JSON.parse(data.toString());
  const { stream } = parsedData;

  if(latencyStats[stream]) {
    const latency = Date.now() - parsedData.data.E;
    if(latency < latencyStats[stream].min) latencyStats[stream].min = latency;
    if(latency > latencyStats[stream].max) latencyStats[stream].max = latency;
    latencyStats[stream].count++;
    latencyStats[stream].total = latencyStats[stream].total + latency;
  }
});

ws.on('error', (error) => {
  console.log('There was an error', error);
});

ws.on('close', () => {
  clearInterval(interval);
  console.log(`The connection was closed at ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`);
});


