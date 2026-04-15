TARGET = build/psp_engine

OBJS = build/src/main.o \
       build/src/systems/render.o \
       build/src/core/memory.o \
       build/src/core/ecs.o \
       build/src/loaders/scene_parser.o \
       build/src/loaders/asset_loader.o

INCDIR = include
CFLAGS = -O2 -G0 -Wall
CXXFLAGS = $(CFLAGS) -fno-exceptions -fno-rtti
ASFLAGS = $(CFLAGS)

LIBDIR =
LDFLAGS =
LIBS = -lpspgu -lpspgum -lm

PSP_EBOOT_TITLE = PSP Engine
PSP_EBOOT = build/EBOOT.PBP
PSP_EBOOT_SFO = build/PARAM.SFO
EXTRA_TARGETS = $(PSP_EBOOT)

PSPSDK=$(shell psp-config --pspsdk-path)
include $(PSPSDK)/lib/build.mak

# Compile sources into build/ directory
build/%.o: %.c
	@mkdir -p $(dir $@)
	$(CC) $(CFLAGS) -c $< -o $@

# Override clean to just nuke the build dir
clean:
	-rm -rf build
