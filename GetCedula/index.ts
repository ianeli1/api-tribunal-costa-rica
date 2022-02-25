import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import * as puppeteer from "puppeteer";

let browser: puppeteer.Browser | undefined = undefined;

interface RawParams {
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

interface CedulaResponse {
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

// {
//     "cedula": "118030444",
//     "fechaNacimiento": "09/02/2001",
//     "nombrecompleto": "IAN ELIZONDO CHAVES",
//     "nacionalidad": "COSTARRICENSE",
//     "conocidocomo": " ",
//     "edad": "21 AÑOS",
//     "nombrepadre": "BRAYAN ELIZONDO HIDALGO",
//     "LeyendaMarginal": "NO",
//     "id_padre": "110850113",
//     "nombremadre": "LAURA CHAVES GARBANZO",
//     "id_madre": "110610837",
//     "defuncion2": "",
//     "defunciontemporal": "",
//     "Nota": ""
//   }

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  if (typeof req.query.cedula !== "string") {
    context.res = {
      status: 400,
      body: "Missing cedula",
    };
    context.done();
    return;
  }

  if (req.query.cedula.length < 9) {
    context.res = {
      status: 400,
      body: "Invalid cedula",
    };
    context.done();
    return;
  }
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--autoplay-policy=user-gesture-required",
        "--disable-background-networking",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-breakpad",
        "--disable-client-side-phishing-detection",
        "--disable-component-update",
        "--disable-default-apps",
        "--disable-dev-shm-usage",
        "--disable-domain-reliability",
        "--disable-extensions",
        "--disable-features=AudioServiceOutOfProcess",
        "--disable-hang-monitor",
        "--disable-ipc-flooding-protection",
        "--disable-notifications",
        "--disable-offer-store-unmasked-wallet-cards",
        "--disable-popup-blocking",
        "--disable-print-preview",
        "--disable-prompt-on-repost",
        "--disable-renderer-backgrounding",
        "--disable-setuid-sandbox",
        "--disable-speech-api",
        "--disable-sync",
        "--hide-scrollbars",
        "--ignore-gpu-blacklist",
        "--metrics-recording-only",
        "--mute-audio",
        "--no-default-browser-check",
        "--no-first-run",
        "--no-pings",
        "--no-sandbox",
        "--no-zygote",
        "--password-store=basic",
        "--use-gl=swiftshader",
        "--use-mock-keychain",
      ],
    });
  }

  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (["image", "stylesheet", "font"].includes(req.resourceType())) {
      req.abort();
    } else {
      req.continue();
    }
  });
  await page.goto(
    "https://servicioselectorales.tse.go.cr/chc/consulta_cedula.aspx",
    { waitUntil: "domcontentloaded" }
  );
  await page.click("#txtcedula");
  await page.keyboard.type(req.query.cedula);
  await page.click("#btnConsultaCedula");

  await page.waitForSelector("#TABLE1, span[id=lblmensaje1]");
  if (!!(await page.$$eval("#lblmensaje1", (elements) => elements.length))) {
    context.res = {
      status: 404,
      body: "Cedula not found",
    };
    context.done();
    page.close();
    return;
  }

  const data = (await page.$$eval(
    "td > span[id^=lbl]",
    (elements: HTMLSpanElement[]) =>
      elements.reduce(
        (acc, cv) => ({
          ...acc,
          [cv.id.replace("lbl", "")]: cv.textContent,
        }),
        {} as Record<string, string>
      )
  )) as unknown as RawParams;
  page.close();

  const responseData: CedulaResponse = {
    cedula: data.cedula,
    nombre: data.nombrecompleto,
    nacionalidad: data.nacionalidad,
    edad: parseInt(data.edad),
    cc: data.conocidocomo.trim() ? data.conocidocomo : null,
    fallecido: data.defuncion2.length > 1,
    fechaDefuncion: data.defuncion2.length > 1 ? data.defuncion2 : null,
    fechaNacimiento: data.fechaNacimiento,
    madre: {
      cedula: !!+data.id_madre ? data.id_madre : null,
      nombre: data.nombremadre,
    },
    padre: {
      cedula: !!+data.id_padre ? data.id_padre : null,
      nombre: data.nombrepadre,
    },
    marginal: data.LeyendaMarginal,
    nota: data.Nota,
  };

  context.res = {
    // status: 200, /* Defaults to 200 */
    body: responseData,
  };
  context.done();
};

export default httpTrigger;
