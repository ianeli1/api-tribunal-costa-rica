import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { getBrowser } from "../utils/browser";
import { userRegex } from "../utils/types";

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  if (
    typeof req.query.nombre !== "string" ||
    typeof req.query.primerApellido !== "string" ||
    !["string", "undefined"].includes(typeof req.query.segundoApellido)
  ) {
    context.res = {
      status: 400,
      body: "Missing query params (nombre, primerApellido, segundoApellido?)",
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
    "https://servicioselectorales.tse.go.cr/chc/consulta_nombres.aspx"
  );

  await page.click("#txtnombre");
  await page.keyboard.type(req.query.nombre.toLocaleLowerCase());
  await page.click("#txtapellido1");
  await page.keyboard.type(req.query.primerApellido.toLocaleLowerCase());
  if (req.query.segundoApellido) {
    await page.click("#txtapellido2");
    await page.keyboard.type(req.query.segundoApellido);
  }
  await page.click("#btnConsultarNombre");

  await page.waitForSelector("table[id=chk1]");

  const data = await page.$$eval(
    "table[id=chk1] span > label[for^=chk]",
    //@ts-ignore
    (elements: HTMLLabelElement[]) => elements.map((e) => e.textContent ?? "")
  );

  interface UserType {
    nombre: string;
    cedula: string;
    fallecido: boolean;
  }

  page.close();
  const matches = data
    .map((entry) => {
      const match = entry.match(userRegex)?.groups;
      if (!match) return;

      return {
        nombre: match.name,
        cedula: match.cedula,
        fallecido: !!match.fallecido,
      };
    })
    .filter((x): x is UserType => !!x);

  context.res = {
    // status: 200, /* Defaults to 200 */
    body: matches,
  };
};

export default httpTrigger;
