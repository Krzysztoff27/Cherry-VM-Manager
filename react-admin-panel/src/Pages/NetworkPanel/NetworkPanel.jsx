import React from 'react';
import Draggable from 'react-draggable';
import './NetworkPanel.css';

export default function NetworkPanel() {
  return (
    <div id='NetworkPanel'>
      {
        Array.from(Array(10)).map((e,i) => 
          <Draggable grid={[50,50]} bounds="parent" defaultPosition={{x: i * 100, y: 0}}>
            <div className='test'>VM{i+1}</div>
          </Draggable>)
      }
    </div>
  )
}
