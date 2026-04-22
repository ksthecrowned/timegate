"use client";

import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { timegateFetch } from "@/lib/timegate-api";
import type {
  TimeGateEmployee,
  TimeGateListResponse,
  TimeGateSite,
  TimeGateWorkSchedule,
} from "@/types/timegate";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type EmployeeFormProps = {
  mode: "create" | "edit";
  employeeId?: string;
};

export default function EmployeeForm({ mode, employeeId }: EmployeeFormProps) {
  const router = useRouter();
  const [sites, setSites] = useState<TimeGateSite[]>([]);
  const [schedules, setSchedules] = useState<TimeGateWorkSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [contractType, setContractType] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [siteId, setSiteId] = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);
  const [hasFaceEmbedding, setHasFaceEmbedding] = useState(false);

  useEffect(() => {
    return () => {
      if (selectedPhotoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(selectedPhotoPreview);
      }
    };
  }, [selectedPhotoPreview]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [sitesRes, schedulesRes] = await Promise.all([
          timegateFetch<TimeGateListResponse<TimeGateSite>>("/sites?page=1&limit=100"),
          timegateFetch<TimeGateListResponse<TimeGateWorkSchedule>>("/work-schedules?page=1&limit=100"),
        ]);
        if (cancelled) return;
        setSites(sitesRes.data);
        setSchedules(schedulesRes.data);
        if (mode === "create") {
          setSiteId(sitesRes.data[0]?.id ?? "");
        }
        if (mode === "edit" && employeeId) {
          const employee = await timegateFetch<TimeGateEmployee>(`/employees/${employeeId}`);
          if (cancelled) return;
          setFirstName(employee.firstName);
          setLastName(employee.lastName);
          setEmail(employee.email ?? "");
          setBirthDate(employee.birthDate ? employee.birthDate.slice(0, 10) : "");
          setWhatsappPhone(employee.whatsappPhone ?? "");
          setPhone(employee.phone ?? "");
          setAddress(employee.address ?? "");
          setEmployeeCode(employee.employeeCode ?? "");
          setHireDate(employee.hireDate ? employee.hireDate.slice(0, 10) : "");
          setContractType(employee.contractType ?? "");
          setNationalId(employee.nationalId ?? "");
          setEmergencyContactName(employee.emergencyContactName ?? "");
          setEmergencyContactPhone(employee.emergencyContactPhone ?? "");
          setSiteId(employee.siteId ?? sitesRes.data[0]?.id ?? "");
          setScheduleId(employee.scheduleId ?? "");
          setSelectedPhotoPreview(employee.photoUrl ?? null);
          setHasFaceEmbedding(Boolean(employee.hasFaceEmbedding));
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Impossible de charger le formulaire");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [employeeId, mode]);

  function onPhotoPicked(file: File | null) {
    if (!file) return;
    setSelectedPhotoFile(file);
    setSelectedPhotoPreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  async function uploadEmployeePhoto(id: string, file: File, alreadyHasEmbedding: boolean) {
    const form = new FormData();
    form.append("employeeId", id);
    form.append("photo", file);
    const endpoint = alreadyHasEmbedding ? "/face/add-face" : "/face/enroll";
    await timegateFetch(endpoint, { method: "POST", body: form });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(email.trim() ? { email: email.trim() } : mode === "edit" ? { email: null } : {}),
        ...(birthDate ? { birthDate: new Date(birthDate).toISOString() } : {}),
        ...(whatsappPhone.trim() ? { whatsappPhone: whatsappPhone.trim() } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(address.trim() ? { address: address.trim() } : {}),
        ...(employeeCode.trim() ? { employeeCode: employeeCode.trim() } : {}),
        ...(hireDate ? { hireDate: new Date(hireDate).toISOString() } : {}),
        ...(contractType.trim() ? { contractType: contractType.trim() } : {}),
        ...(nationalId.trim() ? { nationalId: nationalId.trim() } : {}),
        ...(emergencyContactName.trim() ? { emergencyContactName: emergencyContactName.trim() } : {}),
        ...(emergencyContactPhone.trim() ? { emergencyContactPhone: emergencyContactPhone.trim() } : {}),
        ...(siteId ? { siteId } : mode === "edit" ? { siteId: null } : {}),
        ...(scheduleId ? { scheduleId } : mode === "edit" ? { scheduleId: null } : {}),
      };

      let employee: TimeGateEmployee;
      if (mode === "create") {
        employee = await timegateFetch<TimeGateEmployee>("/employees", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        if (!employeeId) throw new Error("Identifiant employé manquant");
        employee = await timegateFetch<TimeGateEmployee>(`/employees/${employeeId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }

      if (selectedPhotoFile) {
        await uploadEmployeePhoto(employee.id, selectedPhotoFile, mode === "edit" ? hasFaceEmbedding : false);
      }
      router.push("/timegate/employees");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  const filteredSchedules = schedules.filter((s) => !siteId || s.siteId === siteId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {mode === "create" ? "Nouvel employé" : "Modifier l'employé"}
        </h1>
      </div>

      {error && (
        <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><Label>Prénom</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
              <div><Label>Nom</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div>
              <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label>Code employé</Label><Input value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} /></div>
              <div><Label>Téléphone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div><Label>Date de naissance</Label><Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} /></div>
              <div><Label>WhatsApp</Label><Input value={whatsappPhone} onChange={(e) => setWhatsappPhone(e.target.value)} /></div>
              <div><Label>Date d'embauche</Label><Input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} /></div>
              <div><Label>Type de contrat</Label><Input value={contractType} onChange={(e) => setContractType(e.target.value)} /></div>
              <div><Label>Pièce d'identité</Label><Input value={nationalId} onChange={(e) => setNationalId(e.target.value)} /></div>
              <div><Label>Contact urgence (nom)</Label><Input value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} /></div>
              <div><Label>Contact urgence (téléphone)</Label><Input value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Adresse</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
              <div>
                <Label>Site</Label>
                <select
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-900 outline-none focus:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Planning de travail</Label>
                <select
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-900 outline-none focus:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  value={scheduleId}
                  onChange={(e) => setScheduleId(e.target.value)}
                >
                  <option value="">Aucun (fallback site)</option>
                  {filteredSchedules.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Photo employé</p>
              <div className="mt-3 h-36 w-36 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                {selectedPhotoPreview ? (
                  <img src={selectedPhotoPreview} alt="Photo employé" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-gray-500">Aucune photo</div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5">
                  Prendre photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={(e) => {
                      onPhotoPicked(e.target.files?.[0] ?? null);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5">
                  Uploader photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      onPhotoPicked(e.target.files?.[0] ?? null);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push("/timegate/employees")}
                className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/5"
              >
                Annuler
              </button>
              <Button size="sm" disabled={saving}>
                {saving ? "Enregistrement..." : mode === "create" ? "Créer" : "Enregistrer"}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
