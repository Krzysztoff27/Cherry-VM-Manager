import React from 'react'
import './Navigation.css'
import Card from '../Card/Card'

export default function Navigation() {
  return (
    <nav>
        <Card name='Podgląd' link='/'/>
        <Card name='Desktop 1' link='/vm/1'/>
        <Card name='Desktop 2' link='/vm/2'/>
    </nav>
  )
}
