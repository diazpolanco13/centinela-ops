import { Fragment } from "react";
import { Link } from "react-router-dom";
import { usePathnameNavegacion } from "@/contexts/PathnameNavegacionContext";
import { migasPanDeRuta } from "@/layouts/migasPan";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function MigasPanNav() {
  const { pathname } = usePathnameNavegacion();
  const migas = migasPanDeRuta(pathname);
  if (migas.length === 0) return null;
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {migas.map((miga, i) => {
          const ultimo = i === migas.length - 1;
          return (
            <Fragment key={`${miga.label}-${i}`}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {ultimo || !miga.to ? (
                  <BreadcrumbPage>{miga.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={miga.to}>{miga.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
