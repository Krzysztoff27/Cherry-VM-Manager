import './Card.css';

export default function Card({id, name, setDisplay}) {
    return (
        <button id={id} className='card' onClick={() => setDisplay(id)}>{name}</button>
    )
}
