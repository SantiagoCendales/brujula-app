import { Car, ChevronDown, ChevronRight, Search, SearchX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import EmptyState from '@/components/EmptyState';
import ErrorMessage from '@/components/ErrorMessage';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useActivityChanges } from '@/lib/liveUpdates';
import { useApi } from '@/lib/useApi';
import VehicleRequests from '@/vehicles/VehicleRequests';

const SEARCH_DELAY_MS = 300;
const OPEN_GROUPS_KEY = 'brujula.vehicles.openCompanies';

// Companies in alphabetical order; each keeps its vehicles in the plate order the API returns.
function groupByCompany(vehicles) {
  const groups = new Map();
  for (const vehicle of vehicles) {
    if (!groups.has(vehicle.company.id)) groups.set(vehicle.company.id, { company: vehicle.company, vehicles: [] });
    groups.get(vehicle.company.id).vehicles.push(vehicle);
  }
  return [...groups.values()].sort((first, second) => first.company.name.localeCompare(second.company.name, 'es'));
}

// Which companies are expanded survives going into a vehicle and coming back, but not closing the app.
function useOpenCompanies() {
  const [openIds, setOpenIds] = useState(() => {
    try {
      return new Set(JSON.parse(sessionStorage.getItem(OPEN_GROUPS_KEY) ?? '[]'));
    } catch {
      return new Set();
    }
  });

  function toggle(companyId) {
    const next = new Set(openIds);
    if (!next.delete(companyId)) next.add(companyId);
    sessionStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify([...next]));
    setOpenIds(next);
  }

  return [openIds, toggle];
}

function VehicleLink({ vehicle, basePath }) {
  return (
    <li>
      <Link to={`${basePath}/${vehicle.id}`} className="block transition-transform active:scale-[0.99]">
        <Card size="sm">
          <CardContent className="flex items-center justify-between gap-3">
            <p className="min-w-0 font-mono text-lg font-semibold tracking-wide">{vehicle.plate}</p>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>
    </li>
  );
}

function CompanyGroup({ company, vehicles, basePath, open, onToggle }) {
  const listId = `company-vehicles-${company.id}`;
  return (
    <li className="flex flex-col gap-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={onToggle}
        className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl border bg-card px-4 text-left transition-transform focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.99]"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{company.name}</span>
          <span className="block text-sm text-muted-foreground">
            {vehicles.length} {vehicles.length === 1 ? 'vehículo' : 'vehículos'}
          </span>
        </span>
        <ChevronDown className={`size-5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul id={listId} className="flex flex-col gap-3 pl-3">
          {vehicles.map((vehicle) => <VehicleLink key={vehicle.id} vehicle={vehicle} basePath={basePath} />)}
        </ul>
      )}
    </li>
  );
}

// Vehicle list with plate search. The API returns only the vehicles each role may see.
// With `grouped`, vehicles are listed under their client, whose plates show when the client is opened
// (or all at once while searching by plate). `requests` shows plate requests above the list:
// 'review' for staff (approve or reject), 'own' for a client (follow them).
export default function VehiclesPage({ title, basePath, grouped = false, requests = null }) {
  const [search, setSearch] = useState('');
  const [plate, setPlate] = useState('');
  const [openIds, toggleCompany] = useOpenCompanies();
  const { data, error, loading, reload } = useApi(`/vehicles${plate ? `?plate=${encodeURIComponent(plate)}` : ''}`);
  useActivityChanges(reload);

  useEffect(() => {
    const timer = setTimeout(() => setPlate(search.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{title}</h1>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por placa"
          aria-label="Buscar por placa"
          className="h-12 bg-card pl-10 text-base"
        />
      </div>

      <ErrorMessage>{error?.message}</ErrorMessage>
      {requests && <VehicleRequests staff={requests === 'review'} />}
      {loading && !data && <Skeleton className="h-20 rounded-xl" />}
      {data?.vehicles.length === 0 &&
        (plate ? (
          <EmptyState icon={SearchX} title={`No encontramos «${plate}»`} description="Revisa la placa o busca solo una parte." />
        ) : (
          <EmptyState icon={Car} title="No hay vehículos" description="Cuando se registre uno, aparece acá." />
        ))}

      {grouped ? (
        <ul className="flex flex-col gap-3">
          {groupByCompany(data?.vehicles ?? []).map(({ company, vehicles }) => (
            <CompanyGroup
              key={company.id}
              company={company}
              vehicles={vehicles}
              basePath={basePath}
              open={Boolean(plate) || openIds.has(company.id)}
              onToggle={() => toggleCompany(company.id)}
            />
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col gap-3">
          {data?.vehicles.map((vehicle) => <VehicleLink key={vehicle.id} vehicle={vehicle} basePath={basePath} />)}
        </ul>
      )}
    </section>
  );
}
