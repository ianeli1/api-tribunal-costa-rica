export interface RawParams {
  cedula: string;
  fechaNacimiento: string;
  nombrecompleto: string;
  nacionalidad: string;
  conocidocomo: string;
  edad: string;
  nombrepadre: string;
  LeyendaMarginal: string;
  id_padre: string;
  nombremadre: string;
  id_madre: string;
  defuncion1?: string;
  defuncion2: string;
  defunciontemporal: string;
  Nota: string;
}

export interface CedulaResponse {
  cedula: string;
  nombre: string;
  cc: string | null;
  nacionalidad: string;
  fechaNacimiento: string;
  edad: number;
  marginal: string;
  nota: string;
  fallecido: boolean;
  fechaDefuncion: string | null;
  padre: {
    nombre: string;
    cedula: string | null;
  };
  madre: {
    nombre: string;
    cedula: string | null;
  };
}

//1- 202610207   ALVARO MARIO RODRIGUEZ ARCE     ***Fallecido***
//31- 500870833   ILBANO MARIO RODRIGUEZ RODRIGUEZ     ***Fallecido***
//8- 207410256   CARLOS MARIO RODRIGUEZ GARCIA
export const userRegex =
  /^.{1,2}- (?<cedula>[0-9]{9})   (?<name>[\w\sñ]+(?<!\s))(?<fallecido>     \*\*\*Fallecido\*\*\*)?/i;
