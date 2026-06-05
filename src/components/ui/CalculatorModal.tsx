import React, { useState, useEffect, useRef } from 'react';
import { X, Delete, Check } from 'lucide-react';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: number) => void;
  initialValue?: number;
  title?: string;
}

type Operation = '+' | '-' | '×' | '÷' | '%' | null;

export function CalculatorModal({ isOpen, onClose, onConfirm, initialValue = 0, title }: CalculatorModalProps) {
  const [display, setDisplay] = useState('0');
  const [firstOperand, setFirstOperand] = useState<number | null>(null);
  const [operation, setOperation] = useState<Operation>(null);
  const [waitingForSecondOperand, setWaitingForSecondOperand] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [pendingPercent, setPendingPercent] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDisplay(initialValue.toString());
      setFirstOperand(null);
      setOperation(null);
      setWaitingForSecondOperand(false);
      setHasError(false);
      setPendingPercent(false);
    }
  }, [isOpen, initialValue]);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  const handleDigit = (digit: string) => {
    setHasError(false);
    
    if (pendingPercent && firstOperand !== null && operation) {
      const percentValue = parseFloat(display);
      const percentOfFirst = firstOperand * (percentValue / 100);
      let result: number;
      
      switch (operation) {
        case '+': result = firstOperand + percentOfFirst; break;
        case '-': result = firstOperand - percentOfFirst; break;
        case '×': result = firstOperand * (percentValue / 100); break;
        case '÷': result = firstOperand / (percentValue / 100); break;
        default: result = percentValue;
      }
      
      setDisplay(result.toString());
      setFirstOperand(result);
      setPendingPercent(false);
    }
    
    if (waitingForSecondOperand) {
      setDisplay(digit);
      setWaitingForSecondOperand(false);
    } else if (display === '0' && digit !== '.') {
      setDisplay(digit);
    } else if (digit === '.' && display.includes('.')) {
      // Do nothing
    } else {
      setDisplay(display + digit);
    }
  };

  const performCalculation = (first: number, second: number, op: Operation): number => {
    switch (op) {
      case '+': return first + second;
      case '-': return first - second;
      case '×': return first * second;
      case '÷': return second !== 0 ? first / second : NaN;
      default: return second;
    }
  };

  const handleOperation = (op: Operation) => {
    const inputValue = parseFloat(display);
    
    if (op === '%') {
      if (firstOperand !== null && operation && !waitingForSecondOperand) {
        const percentValue = inputValue;
        const percentOfFirst = firstOperand * (percentValue / 100);
        let result: number;
        
        switch (operation) {
          case '+': result = firstOperand + percentOfFirst; break;
          case '-': result = firstOperand - percentOfFirst; break;
          case '×': result = firstOperand * (percentValue / 100); break;
          case '÷': result = firstOperand / (percentValue / 100); break;
          default: result = percentValue;
        }
        
        setDisplay(result.toString());
        setFirstOperand(result);
        setOperation(null);
      } else {
        const result = inputValue / 100;
        setDisplay(result.toString());
      }
      return;
    }
    
    if (firstOperand !== null && operation && !waitingForSecondOperand) {
      const result = performCalculation(firstOperand, inputValue, operation);
      if (isNaN(result)) {
        setHasError(true);
        setDisplay('Error');
        return;
      }
      setDisplay(result.toString());
      setFirstOperand(result);
    } else {
      setFirstOperand(inputValue);
    }
    
    setWaitingForSecondOperand(true);
    setOperation(op);
    setPendingPercent(false);
  };

  const handleEquals = () => {
    if (firstOperand === null || operation === null || waitingForSecondOperand) return;
    
    const inputValue = parseFloat(display);
    const result = performCalculation(firstOperand, inputValue, operation);
    
    if (isNaN(result)) {
      setHasError(true);
      setDisplay('Error');
      return;
    }
    
    setDisplay(result.toString());
    setFirstOperand(null);
    setOperation(null);
    setWaitingForSecondOperand(false);
    setPendingPercent(false);
  };

  const handleClear = () => {
    setDisplay('0');
    setHasError(false);
  };

  const handleAllClear = () => {
    setDisplay('0');
    setFirstOperand(null);
    setOperation(null);
    setWaitingForSecondOperand(false);
    setHasError(false);
    setPendingPercent(false);
  };

  const handleBackspace = () => {
    setHasError(false);
    if (display.length === 1 || (display.length === 2 && display.startsWith('-'))) {
      setDisplay('0');
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  const handleNegate = () => {
    setHasError(false);
    if (display === '0' || display === 'Error') return;
    if (display.startsWith('-')) {
      setDisplay(display.slice(1));
    } else {
      setDisplay('-' + display);
    }
  };

  const handleConfirm = () => {
    let finalValue = parseFloat(display);
    
    if (firstOperand !== null && operation !== null && !waitingForSecondOperand) {
      const result = performCalculation(firstOperand, finalValue, operation);
      if (isNaN(result)) {
        setHasError(true);
        setDisplay('Error');
        return;
      }
      finalValue = result;
    }

    if (isNaN(finalValue) || !isFinite(finalValue)) {
      setHasError(true);
      return;
    }
    onConfirm(finalValue);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key >= '0' && e.key <= '9') {
      handleDigit(e.key);
    } else if (e.key === '.') {
      handleDigit('.');
    } else if (e.key === 'Backspace') {
      handleBackspace();
    } else if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      handleEquals();
    } else if (e.key === '-') {
      handleOperation('-');
    } else if (e.key === '+') {
      handleOperation('+');
    } else if (e.key === '*') {
      handleOperation('×');
    } else if (e.key === '/') {
      handleOperation('÷');
    } else if (e.key === '%') {
      handleOperation('%');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[200] px-4 overflow-hidden">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 shadow-2xl animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div 
        className="relative bg-surface border border-border rounded-3xl shadow-2xl w-full max-w-[320px] overflow-hidden animate-in zoom-in-95 duration-150 focus:outline-none"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        ref={modalRef}
      >
        <div className="flex justify-between items-center p-4 pb-1">
          <h3 className="text-xs font-black text-secondary uppercase tracking-[0.2em] truncate mr-2">
            {title || 'Calculadora'}
          </h3>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-secondary hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Display */}
        <div className="px-5 py-4 mb-2 flex flex-col items-end min-h-[90px] justify-center bg-surface-hover mx-4 mt-1 rounded-2xl border border-border shadow-inner">
          <div className="h-6 mb-1 overflow-hidden w-full text-right">
            {firstOperand !== null && operation && (
              <span className="text-sm font-medium text-secondary tracking-tight">
                {firstOperand} {operation}
              </span>
            )}
          </div>
          <div className="w-full text-right">
            <div className={`text-4xl font-bold break-all line-clamp-1 text-primary ${hasError ? 'text-danger' : ''}`}>
              {display}
            </div>
          </div>
        </div>

        {/* Buttons Grid */}
        <div className="p-4 grid grid-cols-4 gap-2">
          <CalcButton onClick={handleAllClear} variant="danger">AC</CalcButton>
          <CalcButton onClick={handleClear} variant="warning">C</CalcButton>
          <CalcButton onClick={handleBackspace} variant="secondary">
            <Delete size={18} />
          </CalcButton>
          <CalcButton 
            onClick={() => handleOperation('÷')} 
            variant={operation === '÷' ? 'primary' : 'operation'}
          >
            ÷
          </CalcButton>

          <CalcButton onClick={() => handleDigit('7')}>7</CalcButton>
          <CalcButton onClick={() => handleDigit('8')}>8</CalcButton>
          <CalcButton onClick={() => handleDigit('9')}>9</CalcButton>
          <CalcButton 
            onClick={() => handleOperation('×')} 
            variant={operation === '×' ? 'primary' : 'operation'}
          >
            ×
          </CalcButton>

          <CalcButton onClick={() => handleDigit('4')}>4</CalcButton>
          <CalcButton onClick={() => handleDigit('5')}>5</CalcButton>
          <CalcButton onClick={() => handleDigit('6')}>6</CalcButton>
          <CalcButton 
            onClick={() => handleOperation('-')} 
            variant={operation === '-' ? 'primary' : 'operation'}
          >
            -
          </CalcButton>

          <CalcButton onClick={() => handleDigit('1')}>1</CalcButton>
          <CalcButton onClick={() => handleDigit('2')}>2</CalcButton>
          <CalcButton onClick={() => handleDigit('3')}>3</CalcButton>
          <CalcButton 
            onClick={() => handleOperation('+')} 
            variant={operation === '+' ? 'primary' : 'operation'}
          >
            +
          </CalcButton>

          <CalcButton onClick={handleNegate} variant="secondary">+/-</CalcButton>
          <CalcButton onClick={() => handleDigit('0')}>0</CalcButton>
          <CalcButton onClick={() => handleDigit('.')}>.</CalcButton>
          <CalcButton onClick={() => handleOperation('%')} variant="secondary">
            %
          </CalcButton>

          <CalcButton onClick={handleEquals} variant="operation">=</CalcButton>
          <div className="col-span-3">
            <button 
              type="button"
              onClick={handleConfirm}
              className="w-full bg-accent text-[var(--accent-text,black)] flex items-center justify-center h-[48px] rounded-2xl text-base font-bold transition-all active:scale-95 duration-150 hover:bg-accent-hover shadow-md"
            >
              <Check size={18} className="stroke-[3px] mr-2" />
              Aceptar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CalcButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'warning' | 'operation';
}

const CalcButton = React.memo(({ children, onClick, className = '', variant = 'default' }: CalcButtonProps) => {
  const variants = {
    default: "bg-surface-hover text-primary hover:bg-border/30 border border-border/20",
    primary: "bg-accent text-[var(--accent-text,black)] hover:bg-accent-hover shadow-sm",
    secondary: "bg-surface-hover/80 text-secondary hover:bg-border/30 border border-border/10",
    danger: "bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20",
    warning: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20",
    operation: "bg-accent/15 text-accent hover:bg-accent/25 border border-accent/20",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${variants[variant]} flex items-center justify-center h-[48px] rounded-2xl text-lg font-bold transition-all active:scale-95 duration-150 ${className}`}
    >
      {children}
    </button>
  );
});
