import React from 'react'
import './LoginPage.css'

export default function LoginPage({setToken, API_URL}) {

    async function getToken(e) {
        e.preventDefault();

        if(!API_URL) return e.target.querySelector('.output').innerText = 'Wystąpił błąd podczas logowania.';

        fetch(API_URL + '/token', {
            method: 'POST', 
            headers: {
                'accept': 'application/json',
            },
            body: new URLSearchParams({
                username: e.target.querySelector('#username').value, 
                password: e.target.querySelector('#password').value
            })
        })
        .then(response => {
            if(!response.ok) throw new Error(`${response.status} ${response.statusText}`);
            return response.json()
        })
        .then(json => setToken(json.access_token))
        .catch(err => e.target.querySelector('.output').innerText = 'Niepoprawny login lub hasło.')
    }

    return (
        <div id='LoginPage'>
            <form onSubmit={getToken}>
                <h1>LOGOWANIE</h1>
                <div className="inputBox"> 
                    <input id='username' type="text" required/> 
                    <i>Login</i> 
                </div> 
                <div className="inputBox"> 
                    <input id='password' type="password" required/> 
                    <i>Hasło</i> 
                </div> 
                <div className="inputBox"> 
                    <input type="submit" value="Zaloguj się"/> 
                </div>
                <div className="output"></div>
            </form>
        </div>
    )
}
