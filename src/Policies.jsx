import {useEffect} from "react";
import {Link} from "react-router";

// Shared layout for the legal pages: routes land mid-page after the hash
// change, so reset the scroll position on mount
function PolicyPage({title, updated, children}) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="policy">
      <Link className="policy-back" to="/">← Torna alla galleria</Link>
      <h1 className="policy-title">{title}</h1>
      <p className="policy-updated">Ultimo aggiornamento: {updated}</p>
      {children}
    </main>
  );
}

export function PrivacyPolicy() {
  return (
    <PolicyPage title="Privacy Policy" updated="31 luglio 2026">
      <h2>Titolare del trattamento</h2>
      <p>
        Daniele Bartorilla — contatto:{" "}
        <a href="mailto:danielebartorilla@gmail.com">
          danielebartorilla@gmail.com
        </a>
        .
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
        <a
          href="https://umami.is/privacy"
          target="_blank"
          rel="noreferrer"
        >
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
    </PolicyPage>
  );
}

export function CookiePolicy() {
  return (
    <PolicyPage title="Cookie Policy" updated="31 luglio 2026">
      <h2>Questo sito non usa cookie</h2>
      <p>
        Nessun cookie, tecnico o di profilazione, viene installato sul tuo
        dispositivo, né da questo sito né da terze parti. Per questo motivo il
        sito non mostra alcun banner di consenso.
      </p>

      <h2>Preferenza sul tema</h2>
      <p>
        L&apos;unico dato salvato sul tuo dispositivo è la scelta tra tema
        chiaro e tema scuro, conservata nel localStorage del browser sotto la
        voce <code>theme</code>. Serve soltanto a ricordare la tua preferenza
        tra una visita e l&apos;altra: non contiene identificatori, non viene
        inviata ad alcun server e non permette di riconoscerti o di seguirti
        tra siti diversi. Trattandosi di una preferenza richiesta da te, non
        necessita di consenso preventivo. Se non tocchi il pulsante del tema
        non viene salvato nulla e il sito segue semplicemente l&apos;impostazione
        chiaro/scuro del tuo dispositivo. Puoi cancellarla in qualsiasi momento
        svuotando i dati del sito dalle impostazioni del browser.
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

      <h2>Aggiornamento</h2>
      <p>Ultima modifica di questa pagina: 31 luglio 2026.</p>

      <h2>Modifiche</h2>
      <p>
        Se in futuro il sito dovesse introdurre cookie, questa pagina verrà
        aggiornata e, dove richiesto, verrà chiesto il consenso.
      </p>
    </PolicyPage>
  );
}
