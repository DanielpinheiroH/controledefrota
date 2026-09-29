import type {Part,Service} from './types';

function scaled(value:string|number,places:number):bigint {
  const text=String(value);
  if(!/^\d+(\.\d*)?$/.test(text))return 0n;
  const [whole,fraction='']=text.split('.');
  if(fraction.length>places)return 0n;
  return BigInt(whole)*10n**BigInt(places)+BigInt(fraction.padEnd(places,'0')||'0');
}
function decimal(cents:bigint){return `${cents/100n}.${String(cents%100n).padStart(2,'0')}`;}
export function maintenanceTotals(services:Service[],parts:Part[],other:string) {
  const labor=services.reduce((sum,s)=>sum+scaled(s.value,2),0n);
  const materials=parts.reduce((sum,p)=>sum+(scaled(p.quantity,3)*scaled(p.unit_price,2)+500n)/1000n,0n);
  const others=scaled(other,2);
  return {labor:decimal(labor),parts:decimal(materials),other:decimal(others),total:decimal(labor+materials+others)};
}
