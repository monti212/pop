import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { countries, Country } from '../utils/countryCodes';

interface CountryCodeSelectorProps {
  selectedCountry: Country;
  onSelectCountry: (country: Country) => void;
}

const CountryCodeSelector: React.FC<CountryCodeSelectorProps> = ({
  selectedCountry,
  onSelectCountry
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.dialCode.includes(searchQuery) ||
    country.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    setFocusedIndex(-1);
  }, [searchQuery]);

  const handleSelectCountry = (country: Country) => {
    onSelectCountry(country);
    setIsOpen(false);
    setSearchQuery('');
    setFocusedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev < filteredCountries.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredCountries.length) {
          handleSelectCountry(filteredCountries[focusedIndex]);
        }
        break;
    }
  };

  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.children[focusedIndex] as HTMLElement;
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [focusedIndex]);

  const handleClearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-3 border border-borders rounded-lg hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent bg-white"
        aria-label="Select country code"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="text-lg leading-none" role="img" aria-label={selectedCountry.name}>
          {selectedCountry.flag}
        </span>
        <span className="text-sm font-semibold text-navy whitespace-nowrap">
          {selectedCountry.dialCode}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          className="fixed left-0 right-0 bottom-0 top-0 z-[59]"
          onClick={() => {
            setIsOpen(false);
            setSearchQuery('');
            setFocusedIndex(-1);
          }}
        />
      )}

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-2 w-[340px] sm:w-[380px] bg-white rounded-xl shadow-2xl border border-gray-200 z-[60] flex flex-col animate-in fade-in slide-in-from-top-2 duration-200"
          role="dialog"
          aria-label="Country selector"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-3 border-b border-gray-200 bg-gray-50/50 rounded-t-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search countries..."
                className="w-full pl-10 pr-9 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal focus:border-teal transition-all bg-white"
                style={{ fontSize: '16px' }}
                autoComplete="off"
                aria-label="Search countries"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {searchQuery && (
              <div className="mt-2 text-xs text-gray-500">
                {filteredCountries.length} {filteredCountries.length === 1 ? 'country' : 'countries'} found
              </div>
            )}
          </div>

          <div
            ref={listRef}
            className="overflow-y-auto max-h-[380px] custom-scrollbar"
            role="listbox"
            aria-label="Countries list"
          >
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country, index) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleSelectCountry(country)}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-150 text-left group ${
                    selectedCountry.code === country.code
                      ? 'bg-teal/10 border-l-4 border-teal'
                      : focusedIndex === index
                      ? 'bg-gray-100'
                      : 'hover:bg-gray-50 border-l-4 border-transparent'
                  }`}
                  role="option"
                  aria-selected={selectedCountry.code === country.code}
                >
                  <span className="text-2xl leading-none flex-shrink-0" role="img" aria-label={country.name}>
                    {country.flag}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-navy truncate group-hover:text-teal transition-colors">
                      {country.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {country.code}
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 font-semibold flex-shrink-0">
                    {country.dialCode}
                  </div>
                  {selectedCountry.code === country.code && (
                    <div className="w-1.5 h-1.5 rounded-full bg-teal flex-shrink-0" />
                  )}
                </button>
              ))
            ) : (
              <div className="p-8 text-center">
                <div className="text-gray-400 mb-2">
                  <Search className="w-8 h-8 mx-auto opacity-50" />
                </div>
                <p className="text-sm font-medium text-gray-600">No countries found</p>
                <p className="text-xs text-gray-500 mt-1">Try a different search term</p>
              </div>
            )}
          </div>

          <div className="p-2 border-t border-gray-200 bg-gray-50/50 rounded-b-xl">
            <p className="text-xs text-gray-500 text-center">
              Use arrow keys to navigate • Enter to select • Esc to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CountryCodeSelector;
