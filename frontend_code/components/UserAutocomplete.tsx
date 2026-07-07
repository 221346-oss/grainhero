import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

export interface UserOption {
  _id: string;
  name: string;
  email: string;
}

interface UserAutocompleteProps {
  label?: string;
  options: UserOption[];
  value: UserOption | UserOption[] | null;
  onChange: (value: UserOption | UserOption[] | null) => void;
  multi?: boolean;
  required?: boolean;
  placeholder?: string;
}

export default function UserAutocomplete({
  label,
  options,
  value,
  onChange,
  multi = false,
  required = false,
  placeholder = "Type to search...",
}: UserAutocompleteProps) {
  const [input, setInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options as user types
  const filteredOptions = options.filter((u) => {
    const search = input.toLowerCase();
    return (
      u.name.toLowerCase().includes(search) ||
      u.email.toLowerCase().includes(search) ||
      u._id.toLowerCase().includes(search)
    );
  });

  // For multi-select, value is UserOption[]; for single, UserOption|null
  const isSelected = (u: UserOption) => {
    if (multi) {
      return Array.isArray(value) && value.some((v) => v._id === u._id);
    } else {
      return (value as UserOption | null)?._id === u._id;
    }
  };

  const handleSelect = (u: UserOption) => {
    if (multi) {
      if (!Array.isArray(value)) {
        onChange([u]);
      } else if (!value.some((v) => v._id === u._id)) {
        onChange([...value, u]);
      }
      setInput("");
    } else {
      onChange(u);
      setInput(u.name);
      setShowDropdown(false);
    }
  };

  const handleRemove = (u: UserOption) => {
    if (multi && Array.isArray(value)) {
      onChange(value.filter((v) => v._id !== u._id));
    }
  };

  // Only allow selection from dropdown
  const handleBlur = () => {
    setTimeout(() => {
      if (!multi && value && input !== (value as UserOption).name) {
        setInput("");
        onChange(null);
      }
      setShowDropdown(false);
    }, 150);
  };

  useEffect(() => {
    if (!multi && value && input !== (value as UserOption).name) {
      setInput((value as UserOption).name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, multi]);

  return (
    <div className="relative">
      {label && <label className="block font-medium mb-1">{label}</label>}
      {multi && Array.isArray(value) && value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-1">
          {value.map((u) => (
            <span key={u._id} className="flex items-center bg-gray-100 rounded px-2 py-1 text-sm">
              {u.name} <span className="ml-1 text-xs text-gray-400">({u.email})</span>
              <button
                type="button"
                className="ml-1 text-gray-400 hover:text-red-500"
                onClick={() => handleRemove(u)}
                aria-label="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        ref={inputRef}
        value={input}
        onChange={e => {
          setInput(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        onBlur={handleBlur}
        required={required && (!multi ? !value : (Array.isArray(value) ? value.length === 0 : true))}
        autoComplete="off"
        placeholder={placeholder}
      />
      {showDropdown && filteredOptions.length > 0 && (
        <ul className="absolute z-10 bg-white border rounded shadow w-full mt-1 max-h-60 overflow-auto p-0">
          {filteredOptions.map((u) => (
            <li
              key={u._id}
              className={`px-4 py-3 hover:bg-gray-100 cursor-pointer text-base border-b last:border-b-0 flex flex-col ${isSelected(u) ? "bg-gray-50 text-gray-400 cursor-not-allowed" : ""}`}
              onMouseDown={() => !isSelected(u) && handleSelect(u)}
            >
              <span className="font-medium">{u.name}</span>
              <span className="text-xs text-gray-500">{u.email} &middot; {u._id}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 