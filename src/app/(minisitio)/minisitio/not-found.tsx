import { MinisitioErrorScreen } from "./error-screen";

export default function MinisitioNotFound() {
  return <MinisitioErrorScreen statusCode={404} />;
}
