import Seo from "../components/Seo";
import TrackWidget from "../components/TrackWidget";

export default function Track() {
  return (
    <>
      <Seo
        title="Track Your Shipment | Kalebudde Logistics"
        description="Track your Kalebudde Logistics consignment in real time. Enter your tracking number for live status, current location and full journey history."
        path="/track"
      />

      <section className="bg-brand-900 py-16 text-center">
        <div className="container-x">
          <p className="eyebrow">Shipment tracker</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold text-white sm:text-5xl">
            Where is my consignment?
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-brand-100">
            Enter your tracking number below to see live status and the complete movement
            history of your shipment.
          </p>
        </div>
      </section>

      <section className="container-x py-16">
        <TrackWidget />
        <p className="mt-10 text-center text-sm text-slate-500">
          Demo tracking numbers: <strong>KL100000001</strong>, <strong>KL100000002</strong>,{" "}
          <strong>KL100000003</strong>
        </p>
      </section>
    </>
  );
}
