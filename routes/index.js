
/*
 * GET home page.
 */

exports.index = function(req, res){
	res.render('index', {title: 'Sid\'s IFTTT project'});
};

exports.userlist = function(db){
	return function(req, res){
		var collection = db.get('ifttt.people');
		collection.find({},{}, function(e, docs){	
			var weeksArr = new Array();			
			calculatePairs(docs, weeksArr, function(results){
				var weeks = results[0];
				var newDoc = results[1];
				
				res.render('userlist', {'weeks': weeks});
			});

		});
	}
}

calculatePairs = function(docs, weeks, callback){
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
				if(person['email'] != people[peopleIdx]['email'] && person['pairedWith'].indexOf(people[peopleIdx]['email']) == -1  && people[peopleIdx]['pairedWith'].indexOf(person['email']) == -1 ) {
					possibleMatches.push([person, people[peopleIdx]]);
					matches.push([person, people[peopleIdx]]);
				}
			}
		}
		
		person['matchPoints'] = matches.length;
	}
	
	//if no possible matches due to already matched before, reset previous matches and redo
	//else continue
	var matches = new Array();
	if(possibleMatches.length == 0){
		callback([weeks, docs]);
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
		
		//if there are matches, then continue with weeks
		if(matches.length > 0){
			weeks.push(matches);
			calculatePairs(docs, weeks, callback);
		
		//if there aren't, then stop
		} else{
			callback([weeks, docs]);
		}
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

exports.updateuser = function(db){
	return function(req, res){
		var collection = db.get('ifttt.people');
		collection.find({},{},function(e, docs){
			res.render('updateuser', {'users' : docs});
		});
	}
}

exports.updateuseraction = function(db){
	return function(req, res){
		var collection = db.get('ifttt.people');
		
		var personName = req.body.userselect;
		var newEmail = req.body.useremail;
		var newTeamsStr = req.body.userteams;
		var validData = false;
		
		var updateData = new Array();
		if(newEmail && newEmail.length > 0){
			updateData['email'] = newEmail;
			validData = true;
		}
		
		if(newTeamsStr && newTeamsStr.trim().length > 0){
			
			//parse teams into array
			var newTeamsArr = new Array();
			if(newTeamsStr.indexOf(',') != -1){
				newTeamsArr = newTeamsStr.split(',');
				
				for(str in newTeamsArr){
					str = str.trim().toLowerCase();
				}
			} else{
				newTeamsArr = [newTeamsStr.trim().toLowerCase()];
			}
			
			updateData['teams'] = newTeamsArr.slice(0);
			validData = true;
		}
			
		//if there's data to update, find person and update information
		if(validData){
			collection.find({
				'name' : personName
			},{},function(e, docs){
				updateData['name'] = personName;
				
				if(!updateData['teams']){
					updateData['teams'] = docs[0]['teams'];
				}
				
				collection.update({
				'name' : personName
				}, 
				updateData);
			});
		}
		res.redirect('updateuser');
		res.location('updateuser');
	}
}

exports.removeuser = function(db){
	return function(req, res){
		var collection = db.get('ifttt.people');
		collection.find({},{},function(e, docs){
			res.render('removeuser', {'users' : docs});
		});
	}
}

exports.removeuseraction = function(db){
	return function(req, res){
		var selectedName = req.body.userselector;
		console.log('selected: ' + selectedName);
		
		var collection = db.get('ifttt.people');
		collection.remove({ 'name' : selectedName});
		res.redirect('removeuser');
		res.location('removeuser');
	}
}

exports.removeteam = function(db){
	return function(req, res){
		var collection = db.get('ifttt.people');
		collection.find({},{},function(e, docs){
				
			//setup names under teams
			var teams = new Array();
			
			//map out teams -> people
			for(var i = 0; i < docs.length; i++){
				for(var j = 0; j < docs[i]["teams"].length; j++){
					if(teams.indexOf(docs[i]['teams'][j]) == -1){
						teams.push(docs[i]["teams"][j]);
					}
				}
			}
			
			for(team in teams){
				console.log(JSON.stringify(team));
			}	
							
			res.render('removeteam', {'teams' : teams});
		});
	}
}

exports.removeteamaction = function(db){
	return function(req, res){
		var team = req.body.teamselector;
		console.log('team: ' + team);
		
		var collection = db.get('ifttt.people');
		collection.update({
			'teams' : team
		}, {
			$pull: { 'teams': team }
		}, { 
			multi: true
		});
		
		res.redirect('removeteam');
		res.redirect('removeteam');
	}
}

