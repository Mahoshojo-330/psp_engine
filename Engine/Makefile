TARGET = psp_engine
OBJS = src/main.o \
       src/systems/render.o \
       src/core/memory.o \
       src/core/ecs.o \
       src/loaders/scene_parser.o \
       src/loaders/asset_loader.o


INCDIR = include
CFLAGS = -O2 -G0 -Wall
CXXFLAGS = $(CFLAGS) -fno-exceptions -fno-rtti
ASFLAGS = $(CFLAGS)

LIBDIR =
LDFLAGS =
LIBS = -lpspgu -lpspgum -lm

EXTRA_TARGETS = EBOOT.PBP
PSP_EBOOT_TITLE = PSP Engine

PSPSDK=$(shell psp-config --pspsdk-path)
include $(PSPSDK)/lib/build.mak
