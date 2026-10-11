export function Footer() {
  return (
    <footer className="site-footer mt-8 px-4 py-4 text-xs sm:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3">
        <p>
          Not an official warning service · Forecast data:{' '}
          <a href="https://api.met.no/weatherapi/locationforecast/2.0/documentation" target="_blank" rel="noopener noreferrer">
            MET Norway (CC BY 4.0)
          </a>
        </p>
        <nav className="site-footer__links" aria-label="Footer links">
          <a href="https://api.met.no/weatherapi/locationforecast/2.0/documentation" target="_blank" rel="noopener noreferrer">Data source</a>
          <a href="https://github.com/ayushkumar-devlab/HeatTrick/issues" target="_blank" rel="noopener noreferrer">Feedback</a>
        </nav>
      </div>
    </footer>
  )
}
