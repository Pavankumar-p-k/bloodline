export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold text-red-600 mb-6">
          About BloodLine
        </h1>

        <p className="text-gray-700 text-lg mb-4">
          <strong>BloodLine</strong> is a health-tech platform designed to save
          lives by connecting blood donors, hospitals, and patients during
          critical emergencies.
        </p>

        <p className="text-gray-700 mb-4">
          Our mission is to make blood availability transparent, fast, and
          reliable — especially during emergencies where every second matters.
        </p>

        <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-3">
          What We Do
        </h2>

        <ul className="list-disc pl-6 text-gray-700 space-y-2">
          <li>Enable emergency blood requests in real time</li>
          <li>Connect verified hospitals with donors</li>
          <li>Track blood inventory and expiry</li>
          <li>Provide admin monitoring and analytics</li>
        </ul>

        <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-3">
          Why BloodLine?
        </h2>

        <p className="text-gray-700">
          Because delays cost lives. BloodLine reduces response time by
          automating matching, notifications, and fulfillment — all in one
          secure platform.
        </p>
      </div>
    </main>
  )
}
