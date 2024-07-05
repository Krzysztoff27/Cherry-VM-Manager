import React from 'react'
import Toggle from '../Toggle/Toggle.jsx';
import Card from '../Card/Card.jsx';
import UserIcon from '/icons/user.svg'
import LogoutIcon from '/icons/logout.svg'
import './Header.css'

export default function Header({user, logoutFunc, isDarkMode, changeColorModeFunc}) {
  return (
    <header>
        <div id='left'>
          <div className='vertical-rule'/>
          <Card name="Maszyny Wirtualne" link='/'/>
          <div className='vertical-rule'/>
          <Card name="Panel Sieci" link='/panel-sieci'/>
          <div className='vertical-rule'/>
          <Card name="Zarządzanie Dostępem" link='/uzytkownicy'/>
          <div className='vertical-rule'/>
        </div>

        <div id='right'>
          <Toggle 
              label={isDarkMode ? 'Tryb ciemny' : 'Tryb jasny'}
              id='colorModeToggle' 
              isChecked={isDarkMode} 
              handleChange={changeColorModeFunc}
          />
          <div className='logged-as'>
            <img src={UserIcon} alt='Ikona użytkownika'/>
            <span>
              <font style={{fontSize: '0.75rem'}}>Zalogowano jako </font><br/>
              {user?.full_name ?? ''}
            </span>
            <img src={LogoutIcon} className='logout' alt='Wyloguj się' title='Wyloguj się' onClick={logoutFunc}/>
          </div>
        </div>
    </header>
  )
}
