angular.module('starter').controller('PlacesHomeController', function ($scope, $state, $stateParams, $ionicHistory, Places) {

    angular.extend($scope, {
        value_id: $stateParams.value_id,
        settings: null,
    });

    Places.setValueId($stateParams.value_id);

    // Router page only!
    Places.settings()
        .then(function (settings) {
            $scope.settings = settings;

            $ionicHistory.nextViewOptions({
                disableAnimate: true,
            });

            if ($scope.settings.default_page === "categories") {
                $state.go('places-categories', {
                    value_id: $scope.value_id
                });
            } else {
                $state.go('places-list', {
                    value_id: $scope.value_id
                });
            }
        });

}).controller('PlacesCategoriesController', function ($scope, $state, $stateParams, $session, $ionicHistory, $rootScope,
                                                      Places) {

    if ($ionicHistory.backView().stateName === 'places-home') {
        $ionicHistory.removeBackView();
    }

    angular.extend($scope, {
        value_id: $stateParams.value_id,
        settings: null,
        module_code: 'places',
        currentFormatBtn: 'ion-sb-grid-33',
        currentFormat: 'place-100',
        categories: [],
        filters: {
            fulltext: "",
            categories: null,
            longitude: 0,
            latitude: 0
        },
    });

    Places.setValueId($stateParams.value_id);

    // Version 2
    $scope.nextFormat = function (user) {
        switch ($scope.currentFormat) {
            case "place-33":
                $scope.setFormat("place-50", user);
                break;
            case "place-50":
                $scope.setFormat("place-100", user);
                break;
            case "place-100": default:
                $scope.setFormat("place-33", user);
            break;
        }
    };

    $scope.setFormat = function (format, user) {
        if (user !== undefined) {
            $session.setItem("places_category_format_" + $stateParams.value_id, format);
        }

        switch (format) {
            case "place-33":
                $scope.currentFormat = "place-33";
                $scope.currentFormatBtn = "ion-sb-grid-50";
                break;
            case "place-50":
                $scope.currentFormat = "place-50";
                $scope.currentFormatBtn = "ion-sb-list1";
                break;
            case "place-100": default:
                $scope.currentFormat = "place-100";
                $scope.currentFormatBtn = "ion-sb-grid-33";
                break;
        }
    };

    $scope.imageSrc = function (picture) {
        if (!picture.length) {
            return './features/places/assets/templates/l1/img/no-category.png';
        }

        return IMAGE_URL + 'images/application' + picture;
    };

    $scope.selectCategory = function (category) {
        $state.go('places-list', {
            value_id: $scope.value_id,
            page_id: $stateParams.page_id,
            category_id: category.id
        });
    };

    $scope.goToMap = function () {
        if ($rootScope.isNotAvailableOffline()) {
            return;
        }

        $state.go('places-list-map', {
            value_id: $scope.value_id,
            page_id: $stateParams.page_id
        });
    };

    // Loading places feature settings
    Places.settings()
        .then(function (settings) {

            $session
                .getItem("places_category_format_" + $stateParams.value_id)
                .then(function (value) {
                    if (value) {
                        $scope.setFormat(value);
                    } else {
                        $scope.setFormat(settings.default_layout);
                    }
                }).catch(function () {
                    $scope.setFormat(settings.default_layout);
                });

            $scope.settings = settings;
            $scope.categories = settings.categories;
        });

}).controller('PlacesListController', function (Location, $q, $ionicHistory, $scope, $rootScope, $session, $state,
                                                $stateParams, $translate, $timeout, Places, Modal) {

    if ($ionicHistory.backView().stateName === 'places-home') {
        $ionicHistory.removeBackView();
    }

    angular.extend($scope, {
        is_loading: true,
        value_id: $stateParams.value_id,
        settings: null,
        collection: [],
        load_more: false,
        card_design: false,
        module_code: 'places',
        modal: null,
        // Version 2
        currentFormatBtn: 'ion-sb-grid-33',
        currentFormat: 'place-100',
        categories: [],
        filters: {
            fulltext: "",
            categories: null,
            longitude: 0,
            latitude: 0
        },
        // Version 2
    });

    Places.setValueId($stateParams.value_id);

    // Version 2
    $scope.nextFormat = function (user) {
        switch ($scope.currentFormat) {
            case "place-33":
                $scope.setFormat("place-50", user);
                break;
            case "place-50":
                $scope.setFormat("place-100", user);
                break;
            case "place-100": default:
                $scope.setFormat("place-33", user);
                break;
        }
    };

    $scope.setFormat = function (format, user) {
        if (user !== undefined) {
            $session.setItem("places_place_format_" + $stateParams.value_id, format);
        }

        switch (format) {
            case "place-33":
                $scope.currentFormat = "place-33";
                $scope.currentFormatBtn = "ion-sb-grid-50";
                break;
            case "place-50":
                $scope.currentFormat = "place-50";
                $scope.currentFormatBtn = "ion-sb-list1";
                break;
            case "place-100": default:
                $scope.currentFormat = "place-100";
                $scope.currentFormatBtn = "ion-sb-grid-33";
            break;
        }
    };

    $scope.refreshPlaces = function () {
        $scope.pullToRefresh();
    };

    /** Re-run findAll with new options */
    $scope.validateFilters = function () {
        $scope.closeFilterModal();

        $scope.collection = [];
        $scope.searchPlaces();
    };

    $scope.closeFilterModal = function () {
        if ($scope.modal) {
            $scope.modal.hide();
        }
    };

    /** Reset filters */
    $scope.clearFilters = function(skipSearch) {
        $scope.categories.forEach(function (category) {
            category.isSelected = false;
        });

        $scope.filters.categories = null;
        $scope.filters.fulltext = "";

        $scope.closeFilterModal();

        $scope.collection = [];
        if (skipSearch === undefined) {
            $scope.searchPlaces();
        }
    };

    $scope.filterModal = function() {
        Modal.fromTemplateUrl('features/places/assets/templates/l1/filter.html', {
            scope: $scope
        }).then(function(modal) {
            $scope.modal = modal;
            $scope.modal.show();
        });
    };

    $scope.imageSrc = function (picture) {
        if (!picture.length) {
            return './features/places/assets/templates/l1/img/no-category.png';
        }

        return IMAGE_URL + 'images/application' + picture;
    };

    // Version 2

    $scope.geolocationAvailable = true;

    // Loading places feature settings
    Places.settings()
        .then(function (settings) {

            $session
                .getItem("places_place_format_" + $stateParams.value_id)
                .then(function (value) {
                    if (value) {
                        $scope.setFormat(value);
                    } else {
                        $scope.setFormat(settings.default_layout);
                    }
                }).catch(function () {
                    $scope.setFormat(settings.default_layout);
                });

            $scope.settings = settings;
            $scope.categories = settings.categories;

            // Select the category if needed
            if ($stateParams.category_id !== undefined) {
                $scope.clearFilters(true);
                $scope.categories.forEach(function (category) {
                    if (category.id == $stateParams.category_id) {
                        category.isSelected = true;
                    }
                });
            }

            // To ensure a fast loading even when GPS is off, we neeeeeed to decrease the GPS timeout!
            Location.getLocation({timeout: 2500})
                .then(function (position) {
                    $scope.filters.latitude = position.coords.latitude;
                    $scope.filters.longitude = position.coords.longitude;
                    $scope.geolocationAvailable = true;
                }, function (error) {
                    $scope.filters.latitude = 0;
                    $scope.filters.longitude = 0;
                    $scope.geolocationAvailable = false;
                });
        });

    // Search places
    $scope.searchPlaces = function (loadMore) {
        Location
            .getLocation({timeout: 2500})
            .then(function (position) {
                $scope.filters.latitude = position.coords.latitude;
                $scope.filters.longitude = position.coords.longitude;
                $scope.geolocationAvailable = true;
            }, function () {
                $scope.filters.latitude = 0;
                $scope.filters.longitude = 0;
                $scope.geolocationAvailable = false;
            }).then(function () {
                $scope.loadPlaces(loadMore, true);
            });
    };

    $scope.loadPlaces = function (loadMore) {
        $scope.is_loading = true;
        $scope.filters.offset = $scope.collection.length;

        // Clear collection.
        if ($scope.collection.length <= 0) {
            $scope.collection = [];
            Places.collection = [];
        }

        // Group categories
        $scope.filters.categories = $scope.categories
            .filter(function (category) {
                return category.isSelected;
            }).map(function (category) {
                return category.id;
            }).join(",");

        Places.findAll($scope.filters, false)
            .then(function (data) {
                Places.collection = Places.collection.concat(angular.copy(data.places));
                $scope.collection = Places.collection;

                $scope.load_more = (data.places.length > 0);

            }).then(function () {
                if (loadMore) {
                    $scope.$broadcast('scroll.infiniteScrollComplete');
                }

                $scope.is_loading = false;
            });
    };

    $scope.goToMap = function () {
        if ($rootScope.isNotAvailableOffline()) {
            return;
        }

        $state.go('places-list-map', {
            value_id: $scope.value_id,
            page_id: $stateParams.page_id
        });
    };

    $scope.showItem = function (item) {
        $state.go('places-view', {
            value_id: $scope.value_id,
            page_id: item.id,
            type: 'places'
        });
    };

    // Initiate the first loading!
    $scope.searchPlaces(false);

}).controller('PlacesViewController', function ($filter, $scope, $rootScope, $state, $stateParams, $translate,
                                                $location, Cms, Places) {
    angular.extend($scope, {
        is_loading: true,
        value_id: $stateParams.value_id,
        social_sharing_active: false,
        use_pull_to_refresh: true,
        pull_to_refresh: false,
        card_design: false
    });

    $scope.blankImage = "./features/places/assets/templates/l1/img/blank-700-440.png";

    if ($stateParams.type === 'places') {
        $scope.use_pull_to_refresh = false;
    }

    Cms.setValueId($stateParams.value_id);

    $scope.loadContent = function () {
        Places.getPlace($stateParams.page_id)
            .then(function (data) {
                $scope.social_sharing_active = (data.social_sharing_active && $rootScope.isNativeApp);
                $scope.blocks = data.blocks;

                $scope.blockChunks = $filter('chunk')(angular.copy($scope.blocks),
                    Math.ceil($scope.blocks.length / 2));

                $scope.page = data.page;
                $scope.page_title = data.page_title;
            }).then(function () {
                $scope.is_loading = false;
            });
    };

    $scope.share = function () {
        var file;
        angular.forEach($scope.blocks, function (block) {
            if (block.gallery) {
                if (block.gallery.length > 0 && file === null) {
                    file = block.gallery[0].url;
                }
            }
        });

        SocialSharing.share(undefined, undefined, undefined, file);
    };

    $scope.onShowMap = function (block) {
        if ($rootScope.isNotAvailableOffline()) {
            return;
        }

        var params = {};

        if (block.latitude && block.longitude) {
            params.latitude = block.latitude;
            params.longitude = block.longitude;
        } else if (block.address) {
            params.address = encodeURI(block.address);
        }

        params.title = block.label;
        params.value_id = $scope.value_id;

        $location.path(Url.get('map/mobile_view/index', params));
    };

    $scope.addToContact = function (contact) {
        contact = {
            firstname: $scope.place.title
        };

        if ($scope.place.phone) {
            contact.phone = $scope.place.phone;
        }
        if ($scope.place.picture) {
            contact.image_url = $scope.place.picture;
        }
        if ($scope.place.address.street) {
            contact.street = $scope.place.address.street;
        }
        if ($scope.place.address.postcode) {
            contact.postcode = $scope.place.address.postcode;
        }
        if ($scope.place.address.city) {
            contact.city = $scope.place.address.city;
        }
        if ($scope.place.address.state) {
            contact.state = $scope.place.address.state;
        }
        if ($scope.place.address.country) {
            contact.country = $scope.place.address.country;
        }

        $scope.message = new Message();
    };

    $scope.loadContent(false);
}).controller('PlacesMapController', function ($scope, $state, $stateParams, $translate, Places) {
    angular.extend($scope, {
        is_loading: true,
        value_id: $stateParams.value_id
    });

    Places.setValueId($stateParams.value_id);

    $scope.loadContent = function () {
        Places.findAllMaps()
            .then(function (data) {
                $scope.page_title = data.page_title;
                $scope.collection = data.places;

                var markers = [];

                for (var i = 0; i < $scope.collection.length; i = i + 1) {
                    var place = $scope.collection[i];

                    var marker = {
                        config: {
                            id: angular.copy(place.id)
                        },
                        title:
                            place.title + '<br />' +
                            place.address.address + '<br />' +
                            '<i class="ion-android-open"></i>&nbsp;' + $translate.instant('See details') + '</span>',
                        onClick: (function (config) {
                            $scope.goToPlace(config.id);
                        })
                    };

                    if (place.address.latitude && place.address.longitude) {
                        marker.latitude = place.address.latitude;
                        marker.longitude = place.address.longitude;
                    } else {
                        marker.address = place.address.address;
                    }

                    if (place.picture) {
                        marker.icon = {
                            url: place.picture,
                            width: 70,
                            height: 44
                        };
                    }

                    markers.push(marker);
                }

                $scope.map_config = {
                    markers: markers,
                    bounds_to_marker: true
                };
            }).finally(function () {
                $scope.is_loading = false;
            });
    };

    $scope.loadContent();

    $scope.goToPlace = function (placeId) {
        $state.go('places-view', {
            value_id: $scope.value_id,
            page_id: placeId,
            type: 'places'
        });
    };
});
