getUserDetails();
let usernameLabel=document.getElementById('usernameLabel');
let nameTextField=document.getElementById('name');
let passwordTextField=document.getElementById('password');
let keyTextField=document.getElementById('key');

let updateButton=document.getElementById('updateButton');
updateButton.addEventListener('click',function(){updateUserDetails(nameTextField.value,passwordTextField.value,keyTextField.value)});

let deleteButton=document.getElementById('deleteButton');
deleteButton.addEventListener('click',function(){deleteUser()});

let fromDate=document.getElementById('fromdate');
fromDate.addEventListener('change',function(){LoadTable(fromDate.value,toDate.value)});

let toDate=document.getElementById('todate');
toDate.addEventListener('change',function(){LoadTable(fromDate.value,toDate.value)});

setDate();
function setDate(){
    let d= new Date();
    let year=d.getFullYear();
    let month=String(d.getMonth()+1).padStart(2, '0');;
    let day=String(d.getDate()).padStart(2, '0');;
    fromDate.value=String(`${year}-${month}-${day}`)
    toDate.value=String(`${year}-${month}-${day}`)
    LoadTable(fromDate.value,toDate.value)
}
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

let table = document.getElementById("usageTable")

async function LoadTable(from,to){
    console.log(from);
    console.log(to);
    let response= await fetch(`/tokenusage/${from}/${to}`);
    let json=await response.json();
    let firstrow= table.firstElementChild;
    table.innerHTML="";
    table.appendChild(firstrow);
    if(json.length==0){
        let row= document.createElement("tr");
        let cell1=document.createElement("td");
        cell1.setAttribute("colspan",2);
        cell1.innerHTML="No data to display";
        row.appendChild(cell1);
        table.appendChild(row);
    }
    for(let i=0;i<json.length;i++){
        let row= document.createElement("tr");
        let cell1=document.createElement("td");
        let cell2=document.createElement("td");
        cell1.innerHTML=(json[i].date).substring(0,10);
        cell2.innerHTML=json[i].tokens;
        row.appendChild(cell1);
        row.appendChild(cell2);
        table.appendChild(row);
    }
}