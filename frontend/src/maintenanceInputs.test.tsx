import {describe,it,expect} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {KmInput,formatKmInput} from './KmInput';
import {Field} from './components';
import {maintenanceTotals} from './maintenanceTotals';
import {MoneyInput} from './MoneyInput';
import {useState} from 'react';

it('carrega valores numéricos retornados pela API na edição',()=>{
  render(<Field label="Valor salvo"><MoneyInput value={500} onChange={()=>{}}/></Field>);
  expect(screen.getByLabelText('Valor salvo')).toHaveValue('500,00');
});

it('associa o rótulo e converte centavos sem alterar o valor salvo',()=>{
  function Form() {
    const [value,setValue]=useState('1234.56');
    return <><Field label="Valor"><MoneyInput value={value} onChange={setValue}/></Field><output>{value}</output></>;
  }
  render(<Form/>);
  const input=screen.getByLabelText('Valor');
  expect(input).toHaveValue('1.234,56');
  fireEvent.change(input,{target:{value:'1'}});
  expect(input).toHaveValue('0,01');
  expect(screen.getByRole('status')).toHaveTextContent('0.01');
  fireEvent.change(input,{target:{value:'0,012'}});
  expect(input).toHaveValue('0,12');
  fireEvent.change(input,{target:{value:''}});
  expect(input).toHaveValue('');
});

describe('quilometragem exata',()=>{
  it('formata 200000 sem alterar seus dígitos',()=>expect(formatKmInput('200000')).toBe('200.000'));
  it('aceita digitação e colagem com pontos',()=>{
    render(<Field label="KM"><KmInput name="mileage" value=""/></Field>);
    const input=screen.getByLabelText('KM');
    fireEvent.change(input,{target:{value:'200000'}});
    expect(input).toHaveValue('200.000');
    expect(input).toHaveAttribute('type','text');
    expect(input).toHaveAttribute('inputmode','numeric');
    fireEvent.change(input,{target:{value:'345.500'}});
    expect(input).toHaveValue('345.500');
  });
  it('valida o mínimo sem permitir retrocesso de KM',()=>{
    render(<Field label="KM"><KmInput name="mileage" value={200000} min={200000}/></Field>);
    fireEvent.change(screen.getByLabelText('KM'),{target:{value:'199997'}});
    expect(screen.getByLabelText('KM')).toBeInvalid();
  });
});
describe('total ao vivo em centavos',()=>{
  it('soma peças, serviços e outros custos',()=>{
    expect(maintenanceTotals([{description:'Troca',value:'500'}],[{name:'Óleo',quantity:'20',unit_price:'35'}],'50')).toEqual({labor:'500.00',parts:'700.00',other:'50.00',total:'1250.00'});
  });
  it('arredonda cada peça como o backend sem erro de ponto flutuante',()=>{
    expect(maintenanceTotals([{description:'Serviço',value:'0.10'}],[{name:'Óleo',quantity:'3.333',unit_price:'0.10'}],'0.20').total).toBe('0.63');
    expect(maintenanceTotals([],[{name:'Peça',quantity:'0.005',unit_price:'1.00'}],'').total).toBe('0.01');
  });
});
