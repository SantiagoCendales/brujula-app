import { ChevronRight, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/auth/AuthContext';
import ErrorMessage from '@/components/ErrorMessage';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/lib/useApi';

const SEARCH_DELAY_MS = 300;

// Vehicle list with plate search. The API returns only the vehicles each role may see.
export default function VehiclesPage({ title, basePath }) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [plate, setPlate] = useState('');
  const { data, error, loading } = useApi(`/vehicles${plate ? `?plate=${encodeURIComponent(plate)}` : ''}`);

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
      {loading && !data && <Skeleton className="h-20 rounded-xl" />}
      {data?.vehicles.length === 0 && (
        <p className="text-muted-foreground">{plate ? `No hay vehículos con "${plate}".` : 'No hay vehículos.'}</p>
      )}

      <ul className="flex flex-col gap-3">
        {data?.vehicles.map((vehicle) => (
          <li key={vehicle.id}>
            <Link to={`${basePath}/${vehicle.id}`} className="block transition-transform active:scale-[0.99]">
              <Card size="sm">
                <CardContent className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-lg font-semibold tracking-wide">{vehicle.plate}</p>
                    <p className="text-muted-foreground">
                      {vehicle.make} {vehicle.model}
                      {user.role !== 'client' && ` · ${vehicle.company.name}`}
                    </p>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
