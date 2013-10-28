
/*
 * GET home page.
 */

exports.index = function(req, res){
	res.render('index', {title: 'Express: Main'});
};

exports.helloworld = function(req, res){
  res.render('helloworld', { title: 'Express Hey', text: 'hey it works!'});
};

exports.userlist = function(db){
	return function(req, res){
		var collection = db.get('ifttt.people');
		collection.find({},{}, function(e, docs){				
			/*ALROGITHM ONE*/

			//setup names under teams
			var teams = new Array();
			var people = new Array();
			var pairs = new Array();
			
			//map out teams -> people
			for(var i = 0; i < docs.length; i++){
				for(var j = 0; j < docs[i]["teams"].length; j++){
					if(!teams[docs[i]["teams"][j]]){
						teams[docs[i]["teams"][j]] = [];
					}
					teams[docs[i]["teams"][j]].push(docs[i]);
				}
			}	
			console.log('teams: ' + JSON.stringify(docs));
			
			//generate a list of total possible matches
			//for each person, match points are the number of matches they can make with other people
			var possibleMatches = new Array();
			for(var personIdx in docs){
				var person = docs[personIdx];
				var matches = new Array();
				
				for(teamIdx in person['teams']){
					var team = person['teams'][teamIdx];
					
					var people = teams[team].slice(0);
					for(peopleIdx in people){
					
						//make match only if it's a different person than before 
						if(person['email'] != people[peopleIdx]['email'] && person['pairedWith'].indexOf(people[peopleIdx]['email'] == -1  && people[peopleIdx]['pairedWith'].indexOf(person['email']) == -1 )) {
							possibleMatches.push([person, people[peopleIdx]]);
							matches.push([person, people[peopleIdx]]);
						}
					}
				}
				
				person['matchPoints'] = matches.length;
			}
			
			//if no possible matches due to already matched before, reset previous matches and redo
			//else continue
				if(possibleMatches.length == 0){
					console.log('empty');
				}
			
			var matches = new Array();
			if(possibleMatches.length == 0 && docs.length > 0 && docs[0]['pairedWith'].length == docs.length){
				console.log('here');
			} else{
				/*sort total possible matches by the sum of match points of the pair (lowest -> greatest)
				This brings the more unique matches to the front of the queue*/
				possibleMatches.sort(function(firstPair, secondPair){
					return (firstPair[0]['matchPoints'] + firstPair[1]['matchPoints']) - (secondPair[0]['matchPoints'] + secondPair[1]['matchPoints']);
				});
				
				//if person isnt already paired, then add to list of pairs (more unique matches first)
				var peoplePassed = new Array();
				for(matchIdx in possibleMatches){
					var pair = possibleMatches[matchIdx];
					var str = pair[0]['name'] + ', ' + pair[1]['name'];
					
					if(peoplePassed.indexOf(pair[0]) == -1 && peoplePassed.indexOf(pair[1]) == -1){
						matches.push(pair);
						peoplePassed.push(pair[0]);
						peoplePassed.push(pair[1]);
						pair[0]['pairedWith'].push(pair[1]['email']);
						pair[1]['pairedWith'].push(pair[0]['email']);
					}
				}
				
				
				var arrStr = '';
				for(matchIdx in matches)
					arrStr += '[' + JSON.stringify(matches[matchIdx][0]['name'] + ', ' + matches[matchIdx][1]['name']) + '],';
				console.log('matches: '  + arrStr);
			}
				res.render('userlist', {'userlist': matches});
		});
	}
}

exports.newuser = function(req, res){
	res.render('newuser', {title: 'New User!'});	
};

exports.adduser = function(db){
	return function(req, res){
	
		//grab person data
		var userName = req.body.username.toLowerCase();
		var userEmail = req.body.useremail.toLowerCase();
		var userTeamsStr = req.body.userteams;
		var userTeamsArr;
		
		//parse teams into array
		if(userTeamsStr.indexOf(',') != -1){
			userTeamsArr = userTeamsStr.split(',');
			
			for(str in userTeamsArr){
				str = str.trim().toLowerCase();
			}
		} else{
			userTeamsArr = [userTeamsStr.trim().toLowerCase()];
		}
		
		console.log('array: ' + userTeamsArr + ' length: ' + userTeamsArr.length);
		
		var collection = db.get('ifttt.people');
			
		//if team exists in db, add person, else add team with person
		collection.find({"name": userName}, function(e, doc){
			if(!doc.length){
				//insert team into db with person
				collection.insert({
					
						"name" : userName,
						"email" : userEmail,
						"teams" : userTeamsArr,
						"pairedWith" : []
					
				}, function(error, doc){
					if(error){
						res.send('error adding info to db');
					} else{
						res.redirect('userlist');
						res.location('userlist');
					}
				});
			} else{
				console.log('already here! : ' + doc + ' ' + doc.length);
						res.redirect('userlist');
						res.location('userlist');
			}
		});
	}	
};
