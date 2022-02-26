import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { getBrowser } from "../utils/browser";
import { CedulaResponse, RawParams } from "../utils/types";

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

  const page = await (await getBrowser()).newPage();
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
    //@ts-ignore
    (elements: HTMLSpanElement[]) =>
      elements.reduce(
        (acc, cv) => ({
          ...acc,
          [cv.id.replace("lbl", "")]: cv.textContent ?? "",
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
