package utils

import (
	"github.com/google/wire"

	"github.com/Xwudao/go-revjs/pkg/utils/jwt"
)

var (
	ProvideUtilSet = wire.NewSet(jwt.NewClient)
)
