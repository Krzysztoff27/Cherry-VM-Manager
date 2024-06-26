import './Toggle.css';

function Toggle({id, label, isChecked, handleChange}){
    return (
        <div className='toggle-container'>
            <input
                type='checkbox'
                className='toggle'
                id={id}
                onChange={handleChange}
                checked={isChecked}
            />
            <label htmlFor={id}>{label}</label>
        </div>
    )
}

export default Toggle;