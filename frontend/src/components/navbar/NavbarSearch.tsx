/**
 * NavbarSearch Component
 * Search bar component cho Navbar
 */
import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

interface NavbarSearchProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
}

const NavbarSearch: React.FC<NavbarSearchProps> = ({
  placeholder = 'Tìm kiếm...',
  onSearch,
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    setQuery('');
    onSearch?.('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch?.(query);
    }
  };

  return (
    <div
      className={`flex-1 relative hidden md:block transition-all min-w-0 ${
        isFocused ? 'max-w-md' : 'max-w-[200px] lg:max-w-xs'
      }`}
    >
      <div
        className={`flex items-center bg-neutral-100 rounded-xl px-3 md:px-4 py-1.5 md:py-2 gap-2 transition-all ${
          isFocused
            ? 'bg-white ring-2 ring-primary-500 shadow-md'
            : 'hover:bg-neutral-200'
        }`}
      >
        <Search size={14} className="text-neutral-500 shrink-0 md:w-4 md:h-4" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-none outline-none text-xs md:text-sm text-neutral-900 placeholder:text-neutral-500 min-w-0"
        />
        {query && (
          <button
            onClick={handleClear}
            className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-neutral-200 hover:bg-neutral-300 flex items-center justify-center transition-colors shrink-0"
            aria-label="Clear search"
          >
            <X size={10} className="text-neutral-600 md:w-3 md:h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

export default NavbarSearch;

