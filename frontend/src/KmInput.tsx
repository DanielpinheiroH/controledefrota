import {useEffect,useRef,useState} from 'react';

export function formatKmInput(value:string|number) {
  const digits=String(value).replace(/\D/g,'').replace(/^0+(?=\d)/,'');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g,'.');
}

export function KmInput({id,name,value,required,min=0,max=99999999}:{id?:string;name:string;value:string|number;required?:boolean;min?:number;max?:number}) {
  const [text,setText]=useState(()=>formatKmInput(value));
  const input=useRef<HTMLInputElement>(null);
  useEffect(()=>setText(formatKmInput(value)),[value]);
  useEffect(()=>{
    const number=Number(text.replaceAll('.',''));
    input.current?.setCustomValidity(text && (number<min||number>max)?`Informe uma quilometragem entre ${formatKmInput(min)} e ${formatKmInput(max)}.`:'');
  },[text,min,max]);
  return <input ref={input} id={id} name={name} type="text" inputMode="numeric" autoComplete="off" required={required} value={text} onChange={event=>{
    const element=event.currentTarget;
    const digitsBefore=element.value.slice(0,element.selectionStart??element.value.length).replace(/\D/g,'').length;
    const formatted=formatKmInput(element.value);
    setText(formatted);
    requestAnimationFrame(()=>{
      if(document.activeElement!==element)return;
      let count=0,position=0;
      while(position<formatted.length&&count<digitsBefore){if(/\d/.test(formatted[position]))count++;position++;}
      element.setSelectionRange(position,position);
    });
  }}/>;
}
