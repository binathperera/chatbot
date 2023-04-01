getUserDetails();
let usernameLabel=document.getElementById('usernameLabel');
let nameTextField=document.getElementById('name');
let passwordTextField=document.getElementById('password');
let keyTextField=document.getElementById('key');

let updateButton=document.getElementById('updateButton');
updateButton.addEventListener('click',function(){updateUserDetails(nameTextField.value,passwordTextField.value,keyTextField.value)});

let deleteButton=document.getElementById('deleteButton');
deleteButton.addEventListener('click',function(){deleteUser()});

async function getUserDetails(){
    let response= await fetch("/settings/get");
    let json=await response.json();
    if(json.retrieved){
        let username=json.username;
        let name=json.name;
        let password=json.password;
        let key=json.key;
        usernameLabel.innerHTML=username;
        nameTextField.value=name;
        passwordTextField.value=password;
        keyTextField.value=key;
    }
    else{
        window.alert("Couldn't retrieve account details")
    }
}
async function updateUserDetails(name,password,key){
    let data={
        "name":name,
        "password":password,
        "key":key
    }
    let settings={
        method:'POST',
        headers:{
            'Content-Type':'application/json',
            'Accept':'application/json'
        },
        body:JSON.stringify(data)
    }
    let response= await fetch('/user/update',settings);
    let json=await response.json();
    if(json.status){
        window.alert("Updated details successfuly");
    }else{
        window.alert("Failed to update your details")
    }
}
async function deleteUser(){
    let userFeedback=window.prompt("Are you sure you want to delete your account? Enter your username to proceed");
    if(userFeedback==usernameLabel.innerText){
        let response= await fetch("/user/delete");
        let json=await response.json();
        if(json.status){
            window.alert("Your account has been deleted");
            window.location="/";
        }
        else{
            window.alert("Couldn't delete your account")
        }
    }else{
        window.alert("Username did not match. Account deletion canceled");
    }
}
