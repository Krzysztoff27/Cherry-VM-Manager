import Navigation from '../../components/Navigation/Navigation';
import './VirtualMachine.css';
import React from 'react'

export default function VirtualMachine({ id }) {
    return (
        <>
            <Navigation/>
            <div id='VMDataDisplay'>
                <div id='PrimaryInfo'>
                    <div className='vm-title'>
                        <h1>Maszyna 1</h1>
                    </div>
                    <ul>
                        <li>
                            Stan: <span style={{ color: 'var(--text-active)' }}>Aktywna</span>    <button>[Uruchom]</button><button>[Zatrzymaj]</button>
                        </li>
                        <li>Typ: Desktop (OpenSUSE Leap 15.4)</li>
                        <br />
                        <li>Domena: <a href="http://desktop1.wisniowa.edu.pl">desktop1.wisniowa.edu.pl</a></li>
                        <li>Adres: <a href="http://10.0.0.1:6969">10.0.0.1:6969</a></li>
                        <br />
                        <li>Aktywne połączenia z:</li>
                        <ul>
                            <li>Adres: 172.16.100.1/24 (VLAN 16)</li>
                            <li>Adres: 10.0.0.69/24 (ADMIN)</li>
                        </ul>
                    </ul>
                </div>
                <div id='Preview'>
                    <iframe src='https://www.terminaltemple.com/' />
                </div>
                <div id='State'>
                    <ul>
                        <li>Stan ... : 95%</li>
                        <li>Stan ... : 43%</li>
                        <li>Stan ... : 45%</li>
                        <li>Stan ... : 88%</li>
                    </ul>

                </div>
            </div>
        </>
    )
}
