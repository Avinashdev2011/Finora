import { useState } from 'react';
import { Card } from '../components/ui.jsx';

const LESSONS = [
  ['Basics', 'What is a stock?', ['A share is a small slice of ownership in a company. If the business grows and earns more, the share price can rise, and some companies also pay dividends.', 'Prices move on demand and supply. Many buyers push the price up, many sellers push it down.', 'In FINORA you practise with virtual money, so mistakes cost nothing.']],
  ['Basics', 'NSE, BSE and trading hours', ['NSE and BSE are India\'s main stock exchanges. Equity trading runs 9:15 AM to 3:30 PM IST, Monday to Friday, excluding exchange holidays.', 'Commodities on MCX run 9:00 AM to 11:30 PM. Currency derivatives run 9:00 AM to 5:00 PM.', 'When a market is closed FINORA freezes prices and blocks new orders, like a real exchange.']],
  ['Orders', 'Order types', ['Market: executes at the best available price now. Limit: executes only at your price or better.', 'Stop-loss (SL): becomes a market order when the trigger price is hit. SL-Limit becomes a limit order at the trigger.', 'Intraday positions must be closed the same day. Delivery shares move to your holdings.']],
  ['Orders', 'What is a GTT?', ['Good Till Triggered orders wait until the price crosses a trigger you set, then place your order automatically.', 'An OCO GTT has two legs, usually a target and a stop-loss. When one triggers, the other is cancelled.']],
  ['Risk', 'Position sizing', ['Decide how much of your capital you accept losing on one trade, often 1 percent or less.', 'Quantity = amount at risk divided by (entry price minus stop-loss price). Try the position-size calculator under Tools.']],
  ['Risk', 'Margin and leverage', ['Margin is the money blocked to hold a leveraged position. Leverage magnifies profits and losses equally.', 'Futures and options need margin. Option buyers pay a premium and can lose at most that premium.']],
  ['Derivatives', 'Futures and options', ['A future is an agreement to buy or sell at a set price on a future date. Lot size is fixed by the exchange.', 'A call gives the right to buy and a put the right to sell at the strike price. Greeks (delta, gamma, theta, vega) describe how the premium reacts to price, time and volatility.', 'Open interest (OI) is the number of outstanding contracts. FINORA shows simulated OI.']],
  ['Invest', 'Mutual funds and SIP', ['A mutual fund pools money from many investors and invests in a portfolio. The NAV is the price per unit, updated once a day.', 'A SIP invests a fixed amount at regular intervals, which averages your purchase cost over time.']],
  ['Invest', 'How IPOs work', ['An IPO is when a company first sells shares to the public. You bid within a price band, funds are blocked, and shares are allotted by lottery if oversubscribed.', 'FINORA\'s IPOs are fictional demos with simulated listing results.']],
  ['Charts', 'Reading indicators', ['RSI above 70 is often called overbought, below 30 oversold. MACD compares two moving averages. Bollinger Bands show volatility around a moving average.', 'Indicators describe the past. They do not predict the future.']],
];

export default function Learn() {
  const [open, setOpen] = useState(0);
  const groups = [...new Set(LESSONS.map((l) => l[0]))];
  return (
    <div className="page">
      <div><h1>Learn</h1><div className="mut sm">Short lessons for new investors. Educational only, not investment advice.</div></div>
      {groups.map((g) => (
        <Card key={g} title={g}>
          {LESSONS.map((l, i) => l[0] === g && (
            <div key={i} className="lesson">
              <button className="lhead" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}><b>{l[1]}</b><span>{open === i ? '−' : '+'}</span></button>
              {open === i && <div className="lbody">{l[2].map((p, k) => <p key={k}>{p}</p>)}</div>}
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}
