function NewController($scope){ 
	var req = new XMLHttpRequest();
    // req.open( "GET", "https://raw.githubusercontent.com/lazyAchyut/LF-JS/master/js/trainee.js", true);
    req.open( "GET", "js/info.js", false);
 
    req.onreadystatechange = function()
    {	
        if( req.readyState == 4 && req.status == 200 )
        { 
            $scope.trainee = JSON.parse( req.responseText );  
        }
    }
    req.send(null);

}


//this is user defined routing
function RouteProvider($route){ 
	$route.$userDefinedRoutes = [{
			when : '/load',
			templateUrl : '/partial/load.html'
		},
		{
			when : '/clear',
			templateUrl : '/partial/empty.html'
		},
		{
			otherwise : '', 
			redirectTo : '/clear'
		}
	];
}
