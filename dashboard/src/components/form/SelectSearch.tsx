"use client";

import { useMemo, useState } from "react";
import Label from "./Label";
import Select from "./Select";
import Input from "./input/InputField";

type Option = { value: string; label: string };

type Props = {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
};

export default function SelectSearch({
  label,
  options,
  value,
  onChange,
  placeholder = "Sélectionner une option",
  searchPlaceholder = "Rechercher...",
}: Props) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchPlaceholder} />
      <Select options={filtered} value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}
