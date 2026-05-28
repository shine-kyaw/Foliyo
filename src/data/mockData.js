/* ── US Large Cap ─────────────────────────────────────────── */
export const usStocks = [
  { symbol:'AAPL',  name:'Apple Inc.',            price:189.84, change:2.34,   changePct:1.25,  volume:'52.3M', mktCap:'2.94T', sector:'Technology',    pe:31.2, region:'US' },
  { symbol:'MSFT',  name:'Microsoft Corp.',        price:415.26, change:5.81,   changePct:1.42,  volume:'18.7M', mktCap:'3.09T', sector:'Technology',    pe:36.8, region:'US' },
  { symbol:'NVDA',  name:'NVIDIA Corp.',           price:877.35, change:-12.44, changePct:-1.40, volume:'41.2M', mktCap:'2.16T', sector:'Technology',    pe:65.4, region:'US' },
  { symbol:'AMZN',  name:'Amazon.com Inc.',        price:192.45, change:3.17,   changePct:1.68,  volume:'34.9M', mktCap:'2.02T', sector:'Cons. Disc.',   pe:42.1, region:'US' },
  { symbol:'GOOGL', name:'Alphabet Inc.',          price:172.63, change:-0.98,  changePct:-0.56, volume:'22.1M', mktCap:'2.14T', sector:'Communication', pe:24.7, region:'US' },
  { symbol:'META',  name:'Meta Platforms',         price:511.82, change:8.24,   changePct:1.64,  volume:'15.3M', mktCap:'1.31T', sector:'Communication', pe:27.3, region:'US' },
  { symbol:'TSLA',  name:'Tesla Inc.',             price:248.42, change:-5.63,  changePct:-2.22, volume:'78.4M', mktCap:'791B',  sector:'Cons. Disc.',   pe:52.6, region:'US' },
  { symbol:'BRK.B', name:'Berkshire Hathaway',     price:407.13, change:1.28,   changePct:0.32,  volume:'3.2M',  mktCap:'889B',  sector:'Financials',    pe:21.4, region:'US' },
  { symbol:'JPM',   name:'JPMorgan Chase',         price:201.54, change:-2.11,  changePct:-1.04, volume:'8.6M',  mktCap:'582B',  sector:'Financials',    pe:12.3, region:'US' },
  { symbol:'V',     name:'Visa Inc.',              price:279.38, change:1.74,   changePct:0.63,  volume:'5.9M',  mktCap:'568B',  sector:'Financials',    pe:29.8, region:'US' },
  { symbol:'JNJ',   name:'Johnson & Johnson',      price:162.77, change:0.54,   changePct:0.33,  volume:'7.4M',  mktCap:'392B',  sector:'Healthcare',    pe:17.2, region:'US' },
  { symbol:'UNH',   name:'UnitedHealth Group',     price:528.34, change:-4.92,  changePct:-0.92, volume:'2.8M',  mktCap:'490B',  sector:'Healthcare',    pe:22.1, region:'US' },
  { symbol:'AMD',   name:'Advanced Micro Devices', price:178.55, change:3.21,   changePct:1.83,  volume:'39.1M', mktCap:'289B',  sector:'Technology',    pe:58.3, region:'US' },
  { symbol:'INTC',  name:'Intel Corp.',            price:38.42,  change:-0.87,  changePct:-2.21, volume:'27.4M', mktCap:'162B',  sector:'Technology',    pe:14.7, region:'US' },
  { symbol:'NFLX',  name:'Netflix Inc.',           price:624.18, change:11.34,  changePct:1.85,  volume:'4.1M',  mktCap:'270B',  sector:'Communication', pe:48.2, region:'US' },
  { symbol:'ORCL',  name:'Oracle Corp.',           price:132.76, change:1.92,   changePct:1.47,  volume:'9.8M',  mktCap:'364B',  sector:'Technology',    pe:29.4, region:'US' },
  { symbol:'CRM',   name:'Salesforce Inc.',        price:304.52, change:4.18,   changePct:1.39,  volume:'6.2M',  mktCap:'296B',  sector:'Technology',    pe:55.1, region:'US' },
  { symbol:'GS',    name:'Goldman Sachs',          price:467.84, change:-3.21,  changePct:-0.68, volume:'2.1M',  mktCap:'156B',  sector:'Financials',    pe:14.2, region:'US' },
  { symbol:'XOM',   name:'Exxon Mobil',            price:118.43, change:0.87,   changePct:0.74,  volume:'14.3M', mktCap:'471B',  sector:'Energy',        pe:14.8, region:'US' },
  { symbol:'WMT',   name:'Walmart Inc.',           price:68.24,  change:0.42,   changePct:0.62,  volume:'11.2M', mktCap:'548B',  sector:'Cons. Staples', pe:31.4, region:'US' },
]

/* ── European Stocks ──────────────────────────────────────── */
export const euStocks = [
  { symbol:'ASML',  name:'ASML Holding N.V.',      price:924.70, change:18.42,  changePct:2.03,  volume:'842K',  mktCap:'367B',  sector:'Technology',    pe:47.2, region:'EU', exchange:'NASDAQ' },
  { symbol:'SAP',   name:'SAP SE',                 price:201.34, change:2.84,   changePct:1.43,  volume:'1.2M',  mktCap:'233B',  sector:'Technology',    pe:38.4, region:'EU', exchange:'NYSE'   },
  { symbol:'LVMH',  name:'LVMH Moët Hennessy',     price:736.80, change:-8.40,  changePct:-1.13, volume:'512K',  mktCap:'372B',  sector:'Cons. Disc.',   pe:22.6, region:'EU', exchange:'OTC'    },
  { symbol:'SHEL',  name:'Shell plc',              price:32.84,  change:0.34,   changePct:1.05,  volume:'6.4M',  mktCap:'218B',  sector:'Energy',        pe:11.4, region:'EU', exchange:'NYSE'   },
  { symbol:'AZN',   name:'AstraZeneca PLC',        price:78.42,  change:1.12,   changePct:1.45,  volume:'3.8M',  mktCap:'246B',  sector:'Healthcare',    pe:32.1, region:'EU', exchange:'NASDAQ' },
  { symbol:'NVS',   name:'Novartis AG',            price:104.22, change:0.88,   changePct:0.85,  volume:'2.1M',  mktCap:'237B',  sector:'Healthcare',    pe:18.4, region:'EU', exchange:'NYSE'   },
  { symbol:'HSBC',  name:'HSBC Holdings plc',      price:42.18,  change:-0.38,  changePct:-0.89, volume:'4.2M',  mktCap:'163B',  sector:'Financials',    pe:9.2,  region:'EU', exchange:'NYSE'   },
  { symbol:'BP',    name:'BP p.l.c.',              price:36.74,  change:0.54,   changePct:1.49,  volume:'8.8M',  mktCap:'112B',  sector:'Energy',        pe:12.8, region:'EU', exchange:'NYSE'   },
  { symbol:'SIEGY', name:'Siemens AG',             price:98.42,  change:1.24,   changePct:1.28,  volume:'318K',  mktCap:'81B',   sector:'Industrials',   pe:21.3, region:'EU', exchange:'OTC'    },
  { symbol:'BAYZF', name:'Bayer AG',               price:34.12,  change:-0.82,  changePct:-2.35, volume:'920K',  mktCap:'33B',   sector:'Healthcare',    pe:8.4,  region:'EU', exchange:'OTC'    },
  { symbol:'TTE',   name:'TotalEnergies SE',       price:64.82,  change:0.74,   changePct:1.15,  volume:'2.4M',  mktCap:'160B',  sector:'Energy',        pe:8.9,  region:'EU', exchange:'NYSE'   },
  { symbol:'UL',    name:'Unilever PLC',           price:52.34,  change:0.28,   changePct:0.54,  volume:'1.8M',  mktCap:'126B',  sector:'Cons. Staples', pe:19.2, region:'EU', exchange:'NYSE'   },
  { symbol:'EADSF', name:'Airbus SE',              price:168.44, change:3.12,   changePct:1.89,  volume:'612K',  mktCap:'131B',  sector:'Industrials',   pe:28.4, region:'EU', exchange:'OTC'    },
  { symbol:'RMS',   name:'Hermès International',  price:2148.0, change:32.00,  changePct:1.51,  volume:'88K',   mktCap:'224B',  sector:'Cons. Disc.',   pe:52.4, region:'EU', exchange:'OTC'    },
]

/* ── Asia / Taiwan / China ────────────────────────────────── */
export const asiaStocks = [
  { symbol:'TSM',    name:'Taiwan Semiconductor (TSMC)', price:168.42, change:4.18,  changePct:2.55,  volume:'12.4M', mktCap:'875B',  sector:'Technology', pe:28.4, region:'TW', exchange:'NYSE'   },
  { symbol:'BABA',   name:'Alibaba Group',               price:82.34,  change:-1.28, changePct:-1.53, volume:'18.2M', mktCap:'206B',  sector:'Technology', pe:12.4, region:'CN', exchange:'NYSE'   },
  { symbol:'TCEHY',  name:'Tencent Holdings',            price:48.72,  change:0.84,  changePct:1.75,  volume:'3.2M',  mktCap:'464B',  sector:'Technology', pe:18.7, region:'CN', exchange:'OTC'    },
  { symbol:'BIDU',   name:'Baidu Inc.',                  price:104.18, change:-2.14, changePct:-2.01, volume:'3.8M',  mktCap:'36B',   sector:'Technology', pe:11.2, region:'CN', exchange:'NASDAQ' },
  { symbol:'JD',     name:'JD.com Inc.',                 price:28.84,  change:0.42,  changePct:1.48,  volume:'7.4M',  mktCap:'45B',   sector:'Technology', pe:14.8, region:'CN', exchange:'NASDAQ' },
  { symbol:'NIO',    name:'NIO Inc.',                    price:6.42,   change:-0.18, changePct:-2.73, volume:'42.1M', mktCap:'12B',   sector:'Cons. Disc.', pe:null, region:'CN', exchange:'NYSE'  },
  { symbol:'SONY',   name:'Sony Group Corp.',            price:93.42,  change:1.28,  changePct:1.39,  volume:'1.4M',  mktCap:'116B',  sector:'Technology', pe:17.4, region:'JP', exchange:'NYSE'   },
  { symbol:'TM',     name:'Toyota Motor Corp.',          price:228.14, change:2.84,  changePct:1.26,  volume:'624K',  mktCap:'318B',  sector:'Cons. Disc.', pe:8.4,  region:'JP', exchange:'NYSE'  },
  { symbol:'SSNLF',  name:'Samsung Electronics',         price:54.72,  change:-0.84, changePct:-1.51, volume:'812K',  mktCap:'367B',  sector:'Technology', pe:22.4, region:'KR', exchange:'OTC'    },
  { symbol:'SE',     name:'Sea Limited',                 price:54.18,  change:1.24,  changePct:2.34,  volume:'4.2M',  mktCap:'31B',   sector:'Technology', pe:null, region:'SG', exchange:'NYSE'   },
  { symbol:'MRVL',   name:'Marvell Technology',          price:74.32,  change:2.14,  changePct:2.96,  volume:'12.8M', mktCap:'64B',   sector:'Technology', pe:48.4, region:'US', exchange:'NASDAQ' },
  { symbol:'UMC',    name:'United Microelectronics',     price:9.24,   change:0.14,  changePct:1.54,  volume:'5.4M',  mktCap:'23B',   sector:'Technology', pe:12.8, region:'TW', exchange:'NYSE'   },
]

/* ── Commodities ──────────────────────────────────────────── */
export const commodities = [
  { symbol:'GC=F',  name:'Gold',           price:2348.40, change:12.80, changePct:0.55,  unit:'USD/oz',   category:'Metals'   },
  { symbol:'SI=F',  name:'Silver',         price:28.42,   change:0.34,  changePct:1.21,  unit:'USD/oz',   category:'Metals'   },
  { symbol:'CL=F',  name:'WTI Crude Oil',  price:78.84,   change:-0.92, changePct:-1.15, unit:'USD/bbl',  category:'Energy'   },
  { symbol:'BZ=F',  name:'Brent Crude',    price:82.42,   change:-0.84, changePct:-1.01, unit:'USD/bbl',  category:'Energy'   },
  { symbol:'NG=F',  name:'Natural Gas',    price:2.84,    change:0.08,  changePct:2.90,  unit:'USD/MMBtu',category:'Energy'   },
  { symbol:'HG=F',  name:'Copper',         price:4.42,    change:0.06,  changePct:1.37,  unit:'USD/lb',   category:'Metals'   },
  { symbol:'ZW=F',  name:'Wheat',          price:584.25,  change:-4.25, changePct:-0.72, unit:'USc/bu',   category:'Grains'   },
  { symbol:'ZC=F',  name:'Corn',           price:458.75,  change:2.75,  changePct:0.60,  unit:'USc/bu',   category:'Grains'   },
  { symbol:'PL=F',  name:'Platinum',       price:1024.80, change:8.40,  changePct:0.83,  unit:'USD/oz',   category:'Metals'   },
  { symbol:'PA=F',  name:'Palladium',      price:1048.20, change:-12.4, changePct:-1.17, unit:'USD/oz',   category:'Metals'   },
]

/* ── Currencies / FX ──────────────────────────────────────── */
export const currencies = [
  { symbol:'EUR/USD', name:'Euro / US Dollar',      price:1.0842, change:0.0012, changePct:0.11,  category:'Major'  },
  { symbol:'GBP/USD', name:'British Pound / USD',   price:1.2684, change:-0.0018,changePct:-0.14, category:'Major'  },
  { symbol:'USD/JPY', name:'USD / Japanese Yen',    price:151.84, change:0.42,   changePct:0.28,  category:'Major'  },
  { symbol:'USD/CHF', name:'USD / Swiss Franc',     price:0.9024, change:-0.0008,changePct:-0.09, category:'Major'  },
  { symbol:'AUD/USD', name:'Australian Dollar/USD', price:0.6524, change:0.0022, changePct:0.34,  category:'Major'  },
  { symbol:'USD/CAD', name:'USD / Canadian Dollar', price:1.3642, change:0.0018, changePct:0.13,  category:'Major'  },
  { symbol:'USD/CNY', name:'USD / Chinese Yuan',    price:7.2448, change:0.0124, changePct:0.17,  category:'EM'     },
  { symbol:'USD/KRW', name:'USD / South Korean Won',price:1342.4, change:-4.8,   changePct:-0.36, category:'EM'     },
  { symbol:'USD/TWD', name:'USD / Taiwan Dollar',   price:32.42,  change:0.08,   changePct:0.25,  category:'EM'     },
  { symbol:'EUR/GBP', name:'Euro / British Pound',  price:0.8544, change:0.0014, changePct:0.16,  category:'Cross'  },
]

/* ── Crypto ───────────────────────────────────────────────── */
export const cryptos = [
  { symbol:'BTC',  name:'Bitcoin',   price:68420.0,  change:1240.0,  changePct:1.84,  mktCap:'1.35T', volume:'28.4B', category:'Crypto' },
  { symbol:'ETH',  name:'Ethereum',  price:3842.0,   change:84.0,    changePct:2.24,  mktCap:'462B',  volume:'14.2B', category:'Crypto' },
  { symbol:'SOL',  name:'Solana',    price:184.42,   change:-4.18,   changePct:-2.22, mktCap:'81B',   volume:'4.8B',  category:'Crypto' },
  { symbol:'BNB',  name:'BNB',       price:584.20,   change:8.40,    changePct:1.46,  mktCap:'87B',   volume:'1.8B',  category:'Crypto' },
  { symbol:'XRP',  name:'XRP',       price:0.5842,   change:-0.0124, changePct:-2.08, mktCap:'32B',   volume:'2.4B',  category:'Crypto' },
  { symbol:'DOGE', name:'Dogecoin',  price:0.1842,   change:0.0084,  changePct:4.78,  mktCap:'26B',   volume:'3.2B',  category:'Crypto' },
]

/* ── All stocks merged ────────────────────────────────────── */
export const stocks = [...usStocks, ...euStocks, ...asiaStocks]

/* ── Indices ──────────────────────────────────────────────── */
export const indices = [
  { name:'S&P 500',      value:'5,248.49',  change:'+0.74%', up:true  },
  { name:'NASDAQ',       value:'16,384.47', change:'+1.10%', up:true  },
  { name:'DOW JONES',    value:'39,512.84', change:'+0.20%', up:true  },
  { name:'RUSSELL 2000', value:'2,082.11',  change:'-0.31%', up:false },
  { name:'VIX',          value:'14.82',     change:'-3.24%', up:false },
  { name:'FTSE 100',     value:'8,342.10',  change:'+0.48%', up:true  },
  { name:'DAX',          value:'18,124.50', change:'+0.62%', up:true  },
  { name:'NIKKEI 225',   value:'38,820.40', change:'-0.14%', up:false },
  { name:'HANG SENG',    value:'17,284.30', change:'+1.24%', up:true  },
  { name:'TWSE',         value:'20,418.80', change:'+0.88%', up:true  },
  { name:'CRUDE OIL',    value:'$78.42',    change:'+0.58%', up:true  },
  { name:'GOLD',         value:'$2,348',    change:'+0.55%', up:true  },
]

/* ── Price history generator ──────────────────────────────── */
export const generatePriceHistory = (basePrice, days = 90) => {
  const data = []
  let price = basePrice * 0.84
  const now = new Date()
  for (let i = days; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    price = Math.max(price + (Math.random() - 0.47) * price * 0.022, basePrice * 0.45)
    data.push({
      date: date.toLocaleDateString('en-US', { month:'short', day:'numeric' }),
      price: parseFloat(price.toFixed(2)),
      volume: Math.floor(Math.random() * 60e6 + 8e6),
    })
  }
  return data
}

/* ── News ─────────────────────────────────────────────────── */
export const newsArticles = [
  { id:1,  title:'Fed Signals Potential Rate Cuts as Inflation Cools to 2.4%', summary:'Federal Reserve officials signaled openness to cutting interest rates later this year as recent data shows inflation continuing to moderate toward the 2% target. Markets rallied sharply on the news, with tech and growth stocks leading gains.', source:'Reuters', time:'2h ago', category:'Macro', sentiment:'bullish', relatedSymbols:['SPY','TLT','GLD','MSFT','AAPL'], url:'#' },
  { id:2,  title:'NVIDIA Reports Record $22.1B Revenue, Beats Estimates by 8%', summary:'NVIDIA Corp. reported quarterly revenue of $22.1 billion, driven by explosive demand for AI chips. Data center segment grew 427% year-over-year. Blackwell GPU production ramping ahead of schedule.', source:'Bloomberg', time:'4h ago', category:'Earnings', sentiment:'bullish', relatedSymbols:['NVDA','AMD','INTC','TSM'], url:'#' },
  { id:3,  title:'TSMC Posts Strong Q1 on AI Chip Demand, Raises 2024 Forecast', summary:'Taiwan Semiconductor Manufacturing beat earnings expectations, driven by surging demand from AI chip designers. The company raised its full-year revenue forecast citing record CoWoS packaging orders from major AI customers.', source:'WSJ', time:'5h ago', category:'Earnings', sentiment:'bullish', relatedSymbols:['TSM','NVDA','AAPL','ASML'], url:'#' },
  { id:4,  title:'ASML Secures €5.6B in Orders as EUV Demand Accelerates', summary:'ASML reported strong quarterly orders driven by next-generation EUV lithography machines. Backlog now exceeds €40B as chipmakers rush to secure capacity for leading-edge nodes.', source:'FT', time:'6h ago', category:'Earnings', sentiment:'bullish', relatedSymbols:['ASML','TSM','INTC','NVDA'], url:'#' },
  { id:5,  title:'Apple Faces Antitrust Pressure in EU Over App Store Policies', summary:'European regulators issued Apple a preliminary finding of non-compliance with the Digital Markets Act, potentially leading to fines of up to 10% of global revenue. Apple disputes the findings.', source:'FT', time:'7h ago', category:'Regulatory', sentiment:'bearish', relatedSymbols:['AAPL','GOOGL','META'], url:'#' },
  { id:6,  title:'Microsoft Azure Revenue Surges 31% on AI Cloud Demand', summary:"Microsoft's Azure cloud platform continues to capture AI workloads, with CoPilot integrations driving enterprise adoption across Fortune 500 companies. CEO Satya Nadella raised full-year cloud outlook.", source:'CNBC', time:'8h ago', category:'Earnings', sentiment:'bullish', relatedSymbols:['MSFT','AMZN','GOOGL','CRM'], url:'#' },
  { id:7,  title:'Oil Prices Dip as OPEC+ Production Deal Uncertainty Grows', summary:'Crude oil futures fell 1.2% as OPEC+ members disagreed over production cut extensions, raising concerns about supply levels heading into Q3. Brent crude dropped below $83 per barrel.', source:'Reuters', time:'9h ago', category:'Commodities', sentiment:'bearish', relatedSymbols:['XOM','SHEL','BP','TTE','CL=F'], url:'#' },
  { id:8,  title:'Alibaba Surges 8% After Announcing $25B Buyback Program', summary:'Alibaba Group shares surged after the company announced a $25 billion share repurchase authorization, its largest ever, signaling management confidence in long-term fundamentals despite macro headwinds in China.', source:'Bloomberg', time:'10h ago', category:'Corporate', sentiment:'bullish', relatedSymbols:['BABA','JD','BIDU','TCEHY'], url:'#' },
  { id:9,  title:'Tesla Deliveries Miss Q1 Estimates by 16%, Shares Sink', summary:'Tesla delivered 386,810 vehicles in Q1, well below analyst estimates of 457,000. CEO Elon Musk cited factory upgrades and shipping delays. The miss sparked the largest single-day decline in Tesla shares this year.', source:'CNBC', time:'11h ago', category:'Earnings', sentiment:'bearish', relatedSymbols:['TSLA','NIO','GM'], url:'#' },
  { id:10, title:'Amazon Web Services Posts 17% Growth, Signals AI Infrastructure Push', summary:"Amazon's cloud division AWS grew 17% year-over-year in its latest quarter, beating estimates. The company announced a $150B capital expenditure plan through 2027 to expand AI data center capacity.", source:'Bloomberg', time:'13h ago', category:'Earnings', sentiment:'bullish', relatedSymbols:['AMZN','MSFT','GOOGL'], url:'#' },
  { id:11, title:'Meta Launches Llama 4: Open-Source AI Challenges OpenAI', summary:"Meta Platforms released its Llama 4 family of large language models, claiming state-of-the-art performance across benchmarks. The open-source release accelerates competition in the enterprise AI market.", source:'The Verge', time:'14h ago', category:'Corporate', sentiment:'bullish', relatedSymbols:['META','GOOGL','MSFT','NVDA'], url:'#' },
  { id:12, title:'Goldman Sachs Cuts 2024 S&P 500 Target Amid Rate Uncertainty', summary:'Goldman Sachs lowered its year-end S&P 500 target from 5,200 to 4,900, citing higher-for-longer interest rate expectations and compressed earnings multiples in the technology sector.', source:'WSJ', time:'15h ago', category:'Macro', sentiment:'bearish', relatedSymbols:['GS','JPM','BRK.B'], url:'#' },
  { id:13, title:'Bitcoin Hits $70K as Spot ETF Inflows Reach Record $2.4B in Single Day', summary:'Bitcoin surpassed $70,000 for the first time since March as spot Bitcoin ETFs recorded a record $2.4 billion in net inflows in a single trading session, driven by institutional demand.', source:'CoinDesk', time:'16h ago', category:'Crypto', sentiment:'bullish', relatedSymbols:['BTC','ETH','BNB'], url:'#' },
  { id:14, title:'Intel Loses Market Share to AMD in Server CPU Segment', summary:"AMD's EPYC processors captured over 32% of the server CPU market in Q1, up from 24% a year ago, at Intel's expense. Intel's data center revenues fell 8% year-over-year as customers await Granite Rapids.", source:'Reuters', time:'17h ago', category:'Corporate', sentiment:'bearish', relatedSymbols:['INTC','AMD','NVDA'], url:'#' },
  { id:15, title:'LVMH Revenues Decline 2% as Chinese Luxury Demand Softens', summary:'LVMH reported a slight revenue decline in Q1, the first such drop in six years, as Chinese consumers pulled back on luxury spending. European and American markets remained resilient.', source:'FT', time:'18h ago', category:'Earnings', sentiment:'bearish', relatedSymbols:['LVMH','RMS'], url:'#' },
  { id:16, title:'Netflix Q1 Subscriber Growth Smashes Expectations at 9.3M', summary:'Netflix added 9.3 million subscribers in Q1, far exceeding analyst estimates of 4.8 million. The ad-supported tier now accounts for 40% of new sign-ups in available markets.', source:'Bloomberg', time:'20h ago', category:'Earnings', sentiment:'bullish', relatedSymbols:['NFLX','META','GOOGL'], url:'#' },
  { id:17, title:'Gold Surpasses $2,400 Amid Geopolitical Uncertainty and Dollar Weakness', summary:'Gold futures hit a new all-time high above $2,400 per troy ounce, driven by central bank buying from emerging markets, geopolitical tensions, and a weakening US dollar index.', source:'Reuters', time:'21h ago', category:'Commodities', sentiment:'bullish', relatedSymbols:['GC=F','SI=F','GLD','XOM'], url:'#' },
  { id:18, title:'Samsung Announces 2nm Chip Production Timeline for 2025', summary:"Samsung's foundry division announced its 2nm gate-all-around process is on track for mass production in 2025. The announcement intensifies competition with TSMC for Apple and NVIDIA orders.", source:'Nikkei Asia', time:'22h ago', category:'Corporate', sentiment:'neutral', relatedSymbols:['SSNLF','TSM','AAPL','NVDA'], url:'#' },
  { id:19, title:'JPMorgan Q1 Profit Falls 4% as Investment Banking Revenue Slips', summary:"JPMorgan Chase reported a 4% decline in Q1 profit as investment banking fees fell short of expectations. However, net interest income rose 11%, and the bank maintained its full-year NII guidance.", source:'CNBC', time:'1d ago', category:'Earnings', sentiment:'neutral', relatedSymbols:['JPM','GS','V'], url:'#' },
  { id:20, title:'Salesforce to Acquire Informatica for $11.4B in Data Cloud Push', summary:'Salesforce confirmed it is acquiring data management company Informatica for approximately $11.4 billion in a bid to strengthen its Data Cloud and AI platform capabilities.', source:'WSJ', time:'1d ago', category:'Corporate', sentiment:'bullish', relatedSymbols:['CRM','MSFT','ORCL'], url:'#' },
]

/* ── Portfolio ────────────────────────────────────────────── */
export const portfolioHoldings = [
  { symbol:'AAPL',  name:'Apple Inc.',         shares:50, avgCost:158.30, currentPrice:189.84, value:9492,    gainLoss:1577,   gainLossPct:19.93, allocation:22.4, sector:'Technology'  },
  { symbol:'MSFT',  name:'Microsoft Corp.',    shares:20, avgCost:380.15, currentPrice:415.26, value:8305.2,  gainLoss:702.2,  gainLossPct:9.24,  allocation:19.6, sector:'Technology'  },
  { symbol:'NVDA',  name:'NVIDIA Corp.',       shares:8,  avgCost:720.00, currentPrice:877.35, value:7018.8,  gainLoss:1258.8, gainLossPct:21.85, allocation:16.6, sector:'Technology'  },
  { symbol:'TSM',   name:'TSMC',              shares:40, avgCost:142.00, currentPrice:168.42, value:6736.8,  gainLoss:1056.8, gainLossPct:18.60, allocation:15.9, sector:'Technology'  },
  { symbol:'ASML',  name:'ASML Holding',      shares:6,  avgCost:820.00, currentPrice:924.70, value:5548.2,  gainLoss:628.2,  gainLossPct:12.77, allocation:13.1, sector:'Technology'  },
  { symbol:'META',  name:'Meta Platforms',    shares:10, avgCost:475.20, currentPrice:511.82, value:5118.2,  gainLoss:366.2,  gainLossPct:7.70,  allocation:12.1, sector:'Communication'},
  { symbol:'V',     name:'Visa Inc.',         shares:15, avgCost:264.50, currentPrice:279.38, value:4190.7,  gainLoss:223.2,  gainLossPct:5.63,  allocation:9.9,  sector:'Financials'  },
  { symbol:'JPM',   name:'JPMorgan Chase',    shares:5,  avgCost:210.30, currentPrice:201.54, value:1007.7,  gainLoss:-43.8,  gainLossPct:-4.16, allocation:2.4,  sector:'Financials'  },
]

/* ── Watchlist ────────────────────────────────────────────── */
export const defaultWatchlist = [
  { symbol:'AAPL',    category:'US'      },
  { symbol:'NVDA',    category:'US'      },
  { symbol:'TSM',     category:'Asia'    },
  { symbol:'ASML',    category:'EU'      },
  { symbol:'TSLA',    category:'US'      },
  { symbol:'META',    category:'US'      },
  { symbol:'TCEHY',   category:'Asia'    },
  { symbol:'GC=F',    category:'Commodities' },
  { symbol:'BTC',     category:'Crypto'  },
]

/* ── AI Alerts ────────────────────────────────────────────── */
export const aiAlerts = [
  { id:1, symbol:'NVDA', name:'NVIDIA Corp.', type:'BUY', confidence:91, price:877.35, target:1050.00, stopLoss:820.00, timeframe:'4–6 weeks', reasoning:'Strong momentum continuation on weekly chart. AI chip demand cycle shows no signs of cooling. Institutional accumulation detected over last 10 sessions. RSI at 68 with room before overbought territory.', signals:['Momentum','Volume Surge','AI Sector Tailwind','Institutional Flow'], riskReward:'3.1:1', timestamp:'10 min ago' },
  { id:2, symbol:'TSM',  name:'TSMC',        type:'BUY', confidence:88, price:168.42, target:200.00,  stopLoss:155.00, timeframe:'6–8 weeks', reasoning:'AI chip demand super-cycle driving record utilisation. Apple silicon and NVIDIA partnership deepening. Geopolitical concerns overly discounted in current price. Technical breakout above 6-month resistance.', signals:['Breakout','Revenue Growth','AI Tailwind','Geopolitical Discount'], riskReward:'2.6:1', timestamp:'28 min ago' },
  { id:3, symbol:'ASML', name:'ASML Holding', type:'BUY', confidence:85, price:924.70, target:1100.00, stopLoss:870.00, timeframe:'8–12 weeks', reasoning:'Monopoly on EUV technology creates extreme pricing power. Order backlog at all-time high. Semiconductor capex cycle accelerating. Strong free cash flow generation supporting buybacks.', signals:['Moat','Record Backlog','CapEx Cycle','Cash Generation'], riskReward:'2.8:1', timestamp:'1h ago' },
  { id:4, symbol:'TSLA', name:'Tesla Inc.',  type:'SELL', confidence:78, price:248.42, target:205.00,  stopLoss:268.00, timeframe:'2–3 weeks', reasoning:'Distribution pattern detected. Short interest increasing. Multiple resistance levels converging near current price. Delivery numbers expected to disappoint based on supply chain data.', signals:['Distribution','Resistance Cluster','Short Interest Rise','Sector Rotation'], riskReward:'2.3:1', timestamp:'2h ago' },
  { id:5, symbol:'AAPL', name:'Apple Inc.', type:'BUY',  confidence:82, price:189.84, target:225.00,  stopLoss:178.00, timeframe:'5–8 weeks', reasoning:'iPhone 16 supercycle beginning with AI features driving upgrade demand. Services revenue hitting new highs. Technical breakout above 6-month resistance confirmed on volume.', signals:['Product Catalyst','Services Growth','Technical Breakout','Valuation Support'], riskReward:'2.9:1', timestamp:'3h ago' },
  { id:6, symbol:'BABA', name:'Alibaba',    type:'HOLD', confidence:58, price:82.34,  target:95.00,   stopLoss:74.00,  timeframe:'6–8 weeks', reasoning:'Regulatory headwinds easing but macro uncertainty in China persists. Valuation extremely cheap on fundamentals but investor sentiment remains cautious. Wait for clearer catalyst.', signals:['Cheap Valuation','Regulatory Ease','Macro Uncertainty','Weak Sentiment'], riskReward:'1.5:1', timestamp:'4h ago' },
]

/* ── Sector Performance ───────────────────────────────────── */
export const sectorPerformance = [
  { name:'Technology',    change:1.84  },
  { name:'Healthcare',    change:0.42  },
  { name:'Financials',    change:-0.67 },
  { name:'Cons. Disc.',   change:1.21  },
  { name:'Communication', change:0.93  },
  { name:'Energy',        change:-1.12 },
  { name:'Industrials',   change:0.31  },
  { name:'Cons. Staples', change:-0.21 },
]

/* ── Portfolio history ────────────────────────────────────── */
export const portfolioHistory = (() => {
  const data = []; let v = 32000; const now = new Date()
  for (let i = 180; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i)
    v = Math.max(v + (Math.random() - 0.44) * v * 0.014, 28000)
    data.push({ date: d.toLocaleDateString('en-US',{month:'short',day:'numeric'}), value: parseFloat(v.toFixed(2)) })
  }
  return data
})()
