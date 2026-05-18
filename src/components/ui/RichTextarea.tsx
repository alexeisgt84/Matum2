import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { Bold, Italic, Smile } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { RichTextareaHandle } from '../../types/ui';

interface RichTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
}


export const RichTextarea = forwardRef<RichTextareaHandle, RichTextareaProps>(({
  value,
  onChange,
  placeholder,
  label,
  helperText,
  required,
  disabled
}, ref) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { theme } = useStore();

  useImperativeHandle(ref, () => ({
    insertAtCursor: (text: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      const newValue = 
        value.substring(0, start) + 
        text + 
        value.substring(end);

      onChange(newValue);

      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + text.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  }));

  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    // Si hay selección, evitamos que queden espacios dentro del formato (* texto * -> *texto*)
    // ya que WhatsApp no reconoce el formato si empieza o termina con espacio.
    const trimmed = selectedText.trim();
    const leadingSpace = selectedText.match(/^\s*/)?.[0] || '';
    const trailingSpace = selectedText.match(/\s*$/)?.[0] || '';

    const newValue = 
      value.substring(0, start) + 
      leadingSpace + before + trimmed + after + trailingSpace + 
      value.substring(end);

    onChange(newValue);
    
    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      const newStart = start + leadingSpace.length + before.length;
      const newEnd = newStart + trimmed.length;
      textarea.setSelectionRange(newStart, newEnd);
    }, 0);
  };

  const onEmojiClick = (emojiData: any) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = 
      value.substring(0, start) + 
      emojiData.emoji + 
      value.substring(end);

    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + emojiData.emoji.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div className="space-y-2 relative">
      {label && <label className="text-sm font-medium text-secondary ml-1">{label}</label>}
      
      <div className={`group relative flex flex-col bg-surface border border-border rounded-xl transition-all duration-200 focus-within:border-accent focus-within:bg-surface-hover overflow-hidden ${disabled ? 'opacity-50' : ''}`}>
        <textarea
          ref={textareaRef}
          className="w-full bg-transparent p-4 text-primary placeholder:text-secondary/50 outline-none resize-none min-h-[120px] leading-relaxed"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          required={required}
          disabled={disabled}
        />
        
        <div className="flex items-center gap-1 px-2 py-1.5 border-t border-border bg-surface-hover/20">
          <button
            type="button"
            onClick={() => insertText('*', '*')}
            className="p-2 text-secondary hover:text-accent hover:bg-accent/10 rounded-lg transition-all disabled:opacity-50 disabled:pointer-events-none"
            title="Negrita (*)"
            disabled={disabled}
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            onClick={() => insertText('_', '_')}
            className="p-2 text-secondary hover:text-accent hover:bg-accent/10 rounded-lg transition-all disabled:opacity-50 disabled:pointer-events-none"
            title="Cursiva (_)"
            disabled={disabled}
          >
            <Italic size={16} />
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-2 transition-all rounded-lg disabled:opacity-50 disabled:pointer-events-none ${showEmojiPicker ? 'text-accent bg-accent/10' : 'text-secondary hover:text-accent hover:bg-accent/10'}`}
              title="Emojis"
              disabled={disabled}
            >
              <Smile size={16} />
            </button>
            
            {showEmojiPicker && !disabled && (
              <>
                <div 
                  className="fixed inset-0 z-[60]" 
                  onClick={() => setShowEmojiPicker(false)} 
                />
                <div className="absolute bottom-full left-0 mb-4 z-[70] shadow-2xl animate-in zoom-in-95 duration-200 origin-bottom-left">
                  <EmojiPicker
                    onEmojiClick={onEmojiClick}
                    theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
                    width={320}
                    height={400}
                    lazyLoadEmojis={true}
                    searchPlaceholder="Buscar emoji..."
                    previewConfig={{ showPreview: false }}
                    skinTonesDisabled
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {helperText && <p className="text-xs text-secondary ml-1">{helperText}</p>}
    </div>
  );
});
