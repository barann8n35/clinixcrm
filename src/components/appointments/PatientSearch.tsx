import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { User, Phone } from "lucide-react";

interface Patient {
  id: string;
  name: string;
  surname: string | null;
  phone: string | null;
  complaint: string | null;
  location: string | null;
}

interface PatientSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (patient: Patient) => void;
}

const PatientSearch = ({ value, onChange, onSelect }: PatientSearchProps) => {
  const [results, setResults] = useState<Patient[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from("patients")
        .select("id, name, surname, phone, complaint, location")
        .or(`name.ilike.%${query}%,surname.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(8);
      setResults(data || []);
      setShowDropdown(true);
      setLoading(false);
    }, 250);

    return () => clearTimeout(timeout);
  }, [value]);

  const handleSelect = (patient: Patient) => {
    const fullName = [patient.name, patient.surname].filter(Boolean).join(" ");
    onChange(fullName);
    onSelect(patient);
    setShowDropdown(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        placeholder="Hasta adını veya telefon numarasını yazın..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => results.length > 0 && setShowDropdown(true)}
        maxLength={100}
        autoComplete="off"
      />
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-elevated max-h-56 overflow-auto">
          {results.map((p) => {
            const fullName = [p.name, p.surname].filter(Boolean).join(" ");
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p)}
                className="w-full text-left px-3 py-2.5 hover:bg-accent/50 transition-colors flex items-center gap-3 border-b border-border/30 last:border-0"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{fullName}</p>
                  {p.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {p.phone}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
      {showDropdown && loading && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-elevated p-3 text-center text-xs text-muted-foreground">
          Aranıyor...
        </div>
      )}
    </div>
  );
};

export default PatientSearch;
