//go:build wireinject
// +build wireinject

package main

import (
	"github.com/google/wire"

	"github.com/Xwudao/go-revjs/internal/cron"
	"github.com/Xwudao/go-revjs/internal/data"
	"github.com/Xwudao/go-revjs/internal/system"
	"github.com/Xwudao/go-revjs/pkg/utils"

	"github.com/Xwudao/go-revjs/internal/biz"
	"github.com/Xwudao/go-revjs/internal/cmd"
	"github.com/Xwudao/go-revjs/internal/core"
	"github.com/Xwudao/go-revjs/internal/routes"
	"github.com/Xwudao/go-revjs/pkg/config"
	"github.com/Xwudao/go-revjs/pkg/logger"
)

func mainApp() (*cmd.MainApp, func(), error) {
	panic(wire.Build(
		cmd.NewMainApp,
		logger.NewLogger,
		logger.NewZapWriter,
		config.ProviderConfigSet,
		cron.ProviderCronSet,
		core.ProviderCoreSet,
		biz.ProviderBizSet,
		data.ProviderDataSet,
		utils.ProvideUtilSet,
		routes.ProviderRouteSet,
		system.ProviderSystemSet,
	))
}
