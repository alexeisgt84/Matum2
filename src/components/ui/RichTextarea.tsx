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
    
    const trimmed = selectedText.trim();
    const leadingSpace = selectedText.match(/^\s*/)?.[0] || '';
    const trailingSpace = selectedText.match(/\s*$/)?.[0] || '';

    const newValue = 
      value.substring(0, start) + 
      leadingSpace + before + trimmed + after + trailingSpace + 
      value.substring(end);

    onChange(newValue);
    
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
    <div className="space-y-1 relative">
      {label && <label className="text-[11px] font-medium text-secondary ml-0.5 block">{label}</label>}
      
      <div className={`group relative flex flex-col bg-surface border border-border rounded-lg transition-all duration-150 focus-within:border-accent focus-within:bg-surface-hover overflow-hidden ${disabled ? 'opacity-50' : ''}`}>
        <textarea
          ref={textareaRef}
          className="w-full bg-transparent p-2.5 text-xs text-primary placeholder:text-secondary/50 outline-none resize-y min-h-[88px] leading-relaxed"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          required={required}
          disabled={disabled}
        />
        
        <div className="flex items-center gap-1 px-2 py-1 border-t border-border bg-surface-hover/20">
          <button
            type="button"
            onClick={() => insertText('*', '*')}
            className="p-1.5 text-secondary hover:text-accent hover:bg-accent/10 rounded-md transition-all disabled:opacity-50 disabled:pointer-events-none"
            title="Negrita (*)"
            disabled={disabled}
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            onClick={() => insertText('_', '_')}
            className="p-1.5 text-secondary hover:text-accent hover:bg-accent/10 rounded-md transition-all disabled:opacity-50 disabled:pointer-events-none"
            title="Cursiva (_)"
            disabled={disabled}
          >
            <Italic size={14} />
          </button>
          <div className="w-px h-3.5 bg-border mx-0.5" />
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-1.5 transition-all rounded-md disabled:opacity-50 disabled:pointer-events-none ${showEmojiPicker ? 'text-accent bg-accent/10' : 'text-secondary hover:text-accent hover:bg-accent/10'}`}
              title="Emojis"
              disabled={disabled}
            >
              <Smile size={14} />
            </button>
            
            {showEmojiPicker && !disabled && (
              <>
                <div 
                  className="fixed inset-0 z-[60]" 
                  onClick={() => setShowEmojiPicker(false)} 
                />
                <div className="absolute bottom-full left-0 mb-2 z-[70] shadow-2xl rounded-xl overflow-hidden animate-in zoom-in-95 duration-150 origin-bottom-left">
                  <EmojiPicker
                    onEmojiClick={onEmojiClick}
                    theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
                    width={300}
                    height={360}
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

      {helperText && <p className="text-[10px] text-secondary ml-0.5">{helperText}</p>}
    </div>
  );
});
