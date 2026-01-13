import type { ReactNode } from 'react'
import NavBar from '../Common/NavBar'
import Footer from '../Common/Footer'

type MainLayoutProps = {
  children: ReactNode
}

const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="layout">
      <NavBar />
      <main className="main-content">{children}</main>
      <Footer />
    </div>
  )
}

export default MainLayout
