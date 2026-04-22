import ComponentCard from "@/components/common/ComponentCard";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import TimeGateDataTable from "@/components/timegate/TimeGateDataTable";
import { timegateServerFetch } from "@/lib/timegate-server-api";
import type {
  TimeGateAbsenceRecord,
  TimeGateAttendanceEvent,
  TimeGateEmployee,
  TimeGateEmployeeContract,
  TimeGateLateRecord,
  TimeGateLeave,
  TimeGateListResponse,
  TimeGateSalaryRecord,
} from "@/types/timegate";
import Link from "next/link";
import Image from "next/image";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EmployeeProfilePage({ params }: Props) {
  const { id } = await params;
  const [
    employee,
    attendanceRes,
    contractsRes,
    salariesRes,
    lateRes,
    absenceRes,
    leavesRes,
  ] = await Promise.all([
    timegateServerFetch<TimeGateEmployee>(`/employees/${id}`),
    timegateServerFetch<TimeGateListResponse<TimeGateAttendanceEvent>>(
      `/attendance?page=1&limit=100&employeeId=${id}`,
    ),
    timegateServerFetch<TimeGateListResponse<TimeGateEmployeeContract>>(
      `/employees/contracts?page=1&limit=100&employeeId=${id}`,
    ),
    timegateServerFetch<TimeGateListResponse<TimeGateSalaryRecord>>(
      `/salaries?page=1&limit=100&employeeId=${id}`,
    ),
    timegateServerFetch<TimeGateListResponse<TimeGateLateRecord>>(
      `/late-records?page=1&limit=100&employeeId=${id}`,
    ),
    timegateServerFetch<TimeGateListResponse<TimeGateAbsenceRecord>>(
      `/absences?page=1&limit=100&employeeId=${id}`,
    ),
    timegateServerFetch<TimeGateListResponse<TimeGateLeave>>(
      `/leaves?page=1&limit=100&employeeId=${id}`,
    ),
  ]);

  const attendance = attendanceRes.data;
  const contracts = contractsRes.data;
  const salaries = salariesRes.data;
  const lateRecords = lateRes.data;
  const absences = absenceRes.data;
  const leaves = leavesRes.data;
  const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleString("fr-FR") : "—");
  const formatDateOnly = (value?: string | null) => (value ? new Date(value).toLocaleDateString("fr-FR") : "—");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Fiche employé</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {`${employee.firstName} ${employee.lastName}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/timegate/employees">
            <Button size="sm" variant="outline">Retour liste</Button>
          </Link>
          <Link href={`/timegate/employees/${id}/edit`}>
            <Button size="sm">Modifier</Button>
          </Link>
        </div>
      </div>

      <ComponentCard title="Informations RH">
        <div className="grid grid-cols-1 gap-4 text-sm text-gray-700 dark:text-gray-300 md:grid-cols-4">
          <div className="md:col-span-1">
            <p className="mb-2 font-medium">Photo enrôlée</p>
            <div className="h-36 w-36 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
              {employee.photoUrl ? (
                <Image
                  src={employee.photoUrl}
                  alt={`Photo de ${employee.firstName} ${employee.lastName}`}
                  className="h-full w-full object-cover"
                  width={144}
                  height={144}
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-gray-500">
                  Aucune photo
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:col-span-3 md:grid-cols-3">
            <p><span className="font-medium">Code:</span> {employee.employeeCode ?? "—"}</p>
            <p><span className="font-medium">Email:</span> {employee.email ?? "—"}</p>
            <p><span className="font-medium">Téléphone:</span> {employee.phone ?? "—"}</p>
            <p><span className="font-medium">WhatsApp:</span> {employee.whatsappPhone ?? "—"}</p>
            <p><span className="font-medium">Date naissance:</span> {formatDateOnly(employee.birthDate)}</p>
            <p><span className="font-medium">Date embauche:</span> {formatDateOnly(employee.hireDate)}</p>
            <p><span className="font-medium">Contrat:</span> {employee.contractType ?? "—"}</p>
            <p><span className="font-medium">Planning:</span> {employee.schedule?.name ?? "Fallback site"}</p>
            <p><span className="font-medium">Pièce ID:</span> {employee.nationalId ?? "—"}</p>
            <p><span className="font-medium">Face enrôlée:</span> {employee.hasFaceEmbedding ? "Oui" : "Non"}</p>
          </div>
        </div>
      </ComponentCard>

      <ComponentCard title="Historique de présence">
        <TimeGateDataTable
          columns={[
            { key: "timestamp", label: "Horodatage" },
            { key: "type", label: "Type" },
            { key: "confidence", label: "Confiance" },
            { key: "device", label: "Appareil" },
          ]}
          rows={attendance}
          loading={false}
          emptyLabel="Aucun pointage."
          renderRow={(r) => [
            formatDate(r.timestamp),
            r.type === "CHECK_IN" ? "Entrée" : "Sortie",
            r.confidence.toFixed(3),
            r.device?.name ?? r.deviceId,
          ]}
        />
      </ComponentCard>

      <div className="grid gap-5 xl:grid-cols-2">
        <ComponentCard title="Contrats">
          <TimeGateDataTable
            columns={[
              { key: "signedAt", label: "Signature" },
              { key: "expiresAt", label: "Expiration" },
              { key: "renewals", label: "Renouvellements" },
              { key: "status", label: "Statut" },
            ]}
            rows={contracts}
            loading={false}
            emptyLabel="Aucun contrat."
            renderRow={(r) => [
              formatDateOnly(r.signedAt),
              formatDateOnly(r.expiresAt),
              String(r.renewalsCount),
              <Badge key="status" size="sm" color={r.isCurrent ? "success" : "light"}>
                {r.isCurrent ? "Actif" : "Ancien"}
              </Badge>,
            ]}
          />
        </ComponentCard>

        <ComponentCard title="Salaires">
          <TimeGateDataTable
            columns={[
              { key: "period", label: "Période" },
              { key: "base", label: "Base" },
              { key: "net", label: "Net" },
              { key: "status", label: "Statut" },
            ]}
            rows={salaries}
            loading={false}
            emptyLabel="Aucun salaire."
            renderRow={(r) => [
              `${String(r.month).padStart(2, "0")}/${r.year}`,
              r.baseSalary.toFixed(2),
              r.netSalary.toFixed(2),
              <Badge key="status" size="sm" color={r.status === "PAID" ? "success" : "warning"}>
                {r.status === "PAID" ? "Payé" : "En attente"}
              </Badge>,
            ]}
          />
        </ComponentCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ComponentCard title="Retards">
          <TimeGateDataTable
            columns={[
              { key: "date", label: "Date" },
              { key: "minutes", label: "Minutes" },
              { key: "status", label: "Statut" },
            ]}
            rows={lateRecords}
            loading={false}
            emptyLabel="Aucun retard."
            renderRow={(r) => [
              formatDate(r.date),
              String(r.latenessMinutes),
              <Badge key="status" size="sm" color={r.justified ? "success" : "warning"}>
                {r.justified ? "Justifié" : "Non justifié"}
              </Badge>,
            ]}
          />
        </ComponentCard>

        <ComponentCard title="Absences et congés">
          <TimeGateDataTable
            columns={[
              { key: "date", label: "Date" },
              { key: "type", label: "Type" },
              { key: "status", label: "Statut" },
            ]}
            rows={[
              ...absences.map((a) => ({ id: `absence-${a.id}`, date: a.date, type: "Absence", status: a.justified ? "Justifiée" : "Non justifiée" })),
              ...leaves.map((l) => ({ id: `leave-${l.id}`, date: l.startDate, type: "Congé", status: l.status })),
            ]}
            loading={false}
            emptyLabel="Aucune absence/congé."
            renderRow={(r) => [formatDateOnly(r.date), r.type, r.status]}
          />
        </ComponentCard>
      </div>
    </div>
  );
}
