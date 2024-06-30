import { Link } from 'react-router-dom';
import './Card.css';

export default function Card({id, name, link}) {
    return (
        <Link to={link} id={id} className='card'>
            {name}
        </Link>
    )
}
