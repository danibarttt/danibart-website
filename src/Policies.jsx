import {useEffect} from "react";
import {Link} from "react-router";
import {formatDate} from "./i18n.mjs";
import {useLang} from "./lang";
import {LangToggle} from "./Toggles";

// These two pages are the one place where the translation is not a dictionary
// lookup: the prose is long, page-specific and legal, so each page simply
// carries both versions and picks one. Sharing a template between them would
// mean stitching sentences together, which is exactly what a legal text must
// not be.
const UPDATED = "2026-08-01";

// Shared layout for the legal pages: routes land mid-page after the hash
// change, so reset the scroll position on mount
function PolicyPage({title, children}) {
  const {lang, t} = useLang();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="policy">
      <div className="subpage-top">
        <Link className="policy-back" to="/">{t.backToGallery}</Link>
        <LangToggle/>
      </div>
      <h1 className="policy-title">{title}</h1>
      <p className="policy-updated">
        {lang === "en" ? "Last updated" : "Ultimo aggiornamento"}:{" "}
        {formatDate(UPDATED, lang)}
      </p>
      {children}
    </main>
  );
}

const EMAIL = "danielebartorilla@gmail.com";
const MailTo = () => <a href={`mailto:${EMAIL}`}>{EMAIL}</a>;

export function PrivacyPolicy() {
  const {lang} = useLang();

  return (
    <PolicyPage title="Privacy Policy">
      {lang === "en" ? (
        <>
          <h2>Data controller</h2>
          <p>
            Daniele Bartorilla — contact: <MailTo />.
          </p>

          <h2>What data is processed</h2>
          <p>
            This site is a purely informational photo gallery: there is no sign-up,
            no contact form, no comments and no other form of direct collection of
            personal data. The only processing that takes place is described below.
          </p>

          <h2>Hosting</h2>
          <p>
            The site is hosted on GitHub Pages, a service of GitHub, Inc. Like any
            hosting service, GitHub may record technical logs (including the IP
            address) for security purposes and in order to deliver the service. More
            information in{" "}
            <a
              href="https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement"
              target="_blank"
              rel="noreferrer"
            >
              GitHub&apos;s privacy statement
            </a>
            .
          </p>

          <h2>Traffic statistics</h2>
          <p>
            The site uses{" "}
            <a href="https://umami.is" target="_blank" rel="noreferrer">
              Umami
            </a>{" "}
            (Umami Cloud), a privacy-respecting analytics tool: it uses no cookies,
            builds no profiles and does not track visitors across different sites.
            The following is collected in aggregate form: page visited, referring
            site, browser and operating system, screen size and country. The IP
            address is used only at the moment of the visit to derive the country
            and is not stored. More information in{" "}
            <a href="https://umami.is/privacy" target="_blank" rel="noreferrer">
              Umami&apos;s privacy policy
            </a>
            .
          </p>

          <h2>Contact by email</h2>
          <p>
            If you decide to write to the address given above, the data you provide
            (your email address and the content of your message) is used solely to
            reply to you and is not disclosed to third parties.
          </p>

          <h2>External resources</h2>
          <p>
            Fonts and images are served directly by this site: browsing it generates
            no requests to third-party services other than those named above.
          </p>

          <h2>Your rights</h2>
          <p>
            Under Regulation (EU) 2016/679 (GDPR) you may exercise your rights of
            access, rectification, erasure, restriction and objection by writing to
            the controller&apos;s email address. You also have the right to lodge a
            complaint with the Italian data protection authority (Garante per la
            protezione dei dati personali).
          </p>

          <h2>Changes</h2>
          <p>
            Any changes to this notice will be published on this page together with
            the date they were made.
          </p>
        </>
      ) : (
        <>
          <h2>Titolare del trattamento</h2>
          <p>
            Daniele Bartorilla — contatto: <MailTo />.
          </p>

          <h2>Quali dati vengono trattati</h2>
          <p>
            Questo sito è una galleria fotografica puramente informativa: non
            prevede registrazione, moduli di contatto, commenti o altre forme di
            raccolta diretta di dati personali. Gli unici trattamenti sono quelli
            descritti di seguito.
          </p>

          <h2>Hosting</h2>
          <p>
            Il sito è ospitato su GitHub Pages, un servizio di GitHub, Inc. Come
            ogni servizio di hosting, GitHub può registrare log tecnici (tra cui
            l&apos;indirizzo IP) per finalità di sicurezza ed erogazione del
            servizio. Maggiori informazioni nella{" "}
            <a
              href="https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement"
              target="_blank"
              rel="noreferrer"
            >
              privacy statement di GitHub
            </a>
            .
          </p>

          <h2>Statistiche di traffico</h2>
          <p>
            Il sito utilizza{" "}
            <a href="https://umami.is" target="_blank" rel="noreferrer">
              Umami
            </a>{" "}
            (Umami Cloud), uno strumento di statistiche rispettoso della privacy:
            non usa cookie, non crea profili e non traccia i visitatori tra siti
            diversi. Vengono raccolti in forma aggregata: pagina visitata, sito di
            provenienza, tipo di browser e sistema operativo, dimensione dello
            schermo e paese di provenienza. L&apos;indirizzo IP viene usato solo
            al momento della visita per ricavare il paese di provenienza e non
            viene memorizzato. Maggiori informazioni nella{" "}
            <a href="https://umami.is/privacy" target="_blank" rel="noreferrer">
              privacy policy di Umami
            </a>
            .
          </p>

          <h2>Contatti via email</h2>
          <p>
            Se decidi di scrivermi all&apos;indirizzo indicato, i dati che
            fornisci (indirizzo email e contenuto del messaggio) vengono usati
            esclusivamente per risponderti e non vengono comunicati a terzi.
          </p>

          <h2>Risorse esterne</h2>
          <p>
            Font e immagini sono serviti direttamente dal sito: la navigazione non
            genera richieste verso servizi terzi diversi da quelli sopra indicati.
          </p>

          <h2>I tuoi diritti</h2>
          <p>
            Ai sensi del Regolamento (UE) 2016/679 (GDPR) puoi esercitare i
            diritti di accesso, rettifica, cancellazione, limitazione e
            opposizione scrivendo all&apos;indirizzo email del titolare. Hai
            inoltre il diritto di proporre reclamo al Garante per la protezione
            dei dati personali.
          </p>

          <h2>Modifiche</h2>
          <p>
            Eventuali modifiche a questa informativa saranno pubblicate su questa
            pagina con la data di aggiornamento.
          </p>
        </>
      )}
    </PolicyPage>
  );
}

export function CookiePolicy() {
  const {lang} = useLang();

  return (
    <PolicyPage title="Cookie Policy">
      {lang === "en" ? (
        <>
          <h2>This site uses no cookies</h2>
          <p>
            No cookie, technical or profiling, is placed on your device, either by
            this site or by third parties. That is why the site shows no consent
            banner.
          </p>

          <h2>Your display preferences</h2>
          <p>
            The only data stored on your device is what you choose in the two
            buttons at the top of the page: light or dark theme, saved in the
            browser&apos;s localStorage under <code>theme</code>, and Italian or
            English, saved under <code>lang</code>. They exist purely to remember
            your choice from one visit to the next: they contain no identifiers,
            are never sent to any server, and cannot be used to recognise you or
            follow you across different sites. Being preferences you asked for
            yourself, they require no prior consent. If you never touch those two
            buttons nothing is saved at all, and the site simply follows your
            device&apos;s light/dark setting and its language. You can delete them
            at any time by clearing this site&apos;s data from your browser
            settings.
          </p>

          <h2>Cookie-free statistics</h2>
          <p>
            Visit statistics are collected with{" "}
            <a href="https://umami.is" target="_blank" rel="noreferrer">
              Umami
            </a>
            , which works without cookies and without persistent identifiers: no
            individual visitor can be traced. Further details in the{" "}
            <Link to="/privacy">Privacy Policy</Link>.
          </p>

          <h2>Changes</h2>
          <p>
            Should the site introduce cookies in the future, this page will be
            updated and, where required, consent will be requested.
          </p>
        </>
      ) : (
        <>
          <h2>Questo sito non usa cookie</h2>
          <p>
            Nessun cookie, tecnico o di profilazione, viene installato sul tuo
            dispositivo, né da questo sito né da terze parti. Per questo motivo il
            sito non mostra alcun banner di consenso.
          </p>

          <h2>Le tue preferenze di visualizzazione</h2>
          <p>
            Gli unici dati salvati sul tuo dispositivo sono le scelte che fai con i
            due pulsanti in cima alla pagina: tema chiaro o scuro, conservata nel
            localStorage del browser sotto la voce <code>theme</code>, e lingua
            italiana o inglese, sotto la voce <code>lang</code>. Servono soltanto a
            ricordare le tue preferenze tra una visita e l&apos;altra: non
            contengono identificatori, non vengono inviate ad alcun server e non
            permettono di riconoscerti o di seguirti tra siti diversi. Trattandosi
            di preferenze richieste da te, non necessitano di consenso preventivo.
            Se non tocchi quei due pulsanti non viene salvato nulla e il sito segue
            semplicemente l&apos;impostazione chiaro/scuro e la lingua del tuo
            dispositivo. Puoi cancellarle in qualsiasi momento svuotando i dati del
            sito dalle impostazioni del browser.
          </p>

          <h2>Statistiche senza cookie</h2>
          <p>
            Le statistiche di visita sono raccolte con{" "}
            <a href="https://umami.is" target="_blank" rel="noreferrer">
              Umami
            </a>
            , che funziona senza cookie e senza identificatori persistenti: non
            è possibile risalire al singolo visitatore. Ulteriori dettagli nella{" "}
            <Link to="/privacy">Privacy Policy</Link>.
          </p>

          <h2>Modifiche</h2>
          <p>
            Se in futuro il sito dovesse introdurre cookie, questa pagina verrà
            aggiornata e, dove richiesto, verrà chiesto il consenso.
          </p>
        </>
      )}
    </PolicyPage>
  );
}
